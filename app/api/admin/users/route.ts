import { NextResponse } from "next/server";
import { hashPassword, validatePassword } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { isApiResponse, requireAdminApiUser, writeAdminAudit } from "@/lib/admin";
import { enforceRateLimit, errorResponse, normalizeUsername, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";
import { billingPlanValue, parseAdminPlan } from "@/lib/plans";
import { plainText } from "@/lib/text";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const admin = await requireAdminApiUser();
    if (isApiResponse(admin)) return admin;
    const body = await readJsonObject(request, 8_192);
    const username = normalizeUsername(body.username);
    const displayName = plainText(body.displayName, 80, true);
    const password = typeof body.password === "string" ? body.password : "";
    const nextPlan = parseAdminPlan(body.plan) || "free";
    const plan = billingPlanValue(nextPlan);
    if (!username) throw new RequestError(400, "שם המשתמש חייב להכיל 3–32 תווים באנגלית, מספרים, נקודה, מקף או קו תחתון");
    if (displayName.length < 2) throw new RequestError(400, "יש להזין שם תצוגה");
    const internalEmail = `${username}@demo.linkli.invalid`;
    const passwordError = validatePassword(password, internalEmail);
    if (passwordError) throw new RequestError(400, passwordError);

    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "admin-user-create", 20, 3_600, admin.email, "subject");
    const existing = await db.prepare("SELECT username FROM login_aliases WHERE username = ? OR user_email = ?").bind(username, internalEmail).first();
    if (existing) throw new RequestError(409, "שם המשתמש כבר קיים");
    const passwordRecord = await hashPassword(password);
    await db.batch([
      db.prepare("INSERT INTO users (email, display_name, plan, plan_tier) VALUES (?, ?, ?, ?)").bind(internalEmail, displayName, plan, nextPlan),
      db.prepare("INSERT INTO auth_credentials (email, password_hash, password_salt, password_iterations) VALUES (?, ?, ?, ?)")
        .bind(internalEmail, passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations),
      db.prepare("INSERT INTO login_aliases (username, user_email) VALUES (?, ?)").bind(username, internalEmail),
      // Demo accounts have no reachable mailbox; verification is granted explicitly, never by omission.
      db.prepare("INSERT INTO email_verifications (user_email, verified_at) VALUES (?, CURRENT_TIMESTAMP)").bind(internalEmail),
    ]);
    await writeAdminAudit(admin.email, "user.created", "user", username, { plan: nextPlan, demo: true });
    return NextResponse.json({
      user: { email: internalEmail, username, display_name: displayName, plan: nextPlan, status: "active", note: "", email_verified: true, project_count: 0, published_count: 0, created_at: new Date().toISOString().replace("T", " ").slice(0, 19) },
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
