import { NextResponse } from "next/server";
import { createSession, hashPassword, safeReturnTo, serializeSessionCookie, validatePassword } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { enforceRateLimit, errorResponse, normalizeEmail, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";
import { actionUrl, issueAuthToken } from "@/lib/account-security";
import { emailDeliveryConfigured, sendAuthEmail } from "@/lib/email";

export async function POST(request: Request) {
  let stage = "request";
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 8_192);
    if (typeof body.company === "string" && body.company) return NextResponse.json({ ok: true, redirectTo: "/studio" });
    const email = normalizeEmail(body.email);
    const displayName = typeof body.displayName === "string" ? body.displayName.trim().replace(/\s+/g, " ").slice(0, 80) : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || displayName.length < 2) return NextResponse.json({ error: "יש להזין שם וכתובת דוא״ל תקינה" }, { status: 400 });
    if (body.acceptTerms !== true) return NextResponse.json({ error: "יש לאשר את תנאי השימוש ומדיניות הפרטיות" }, { status: 400 });
    const passwordError = validatePassword(password, email);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    stage = "database";
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "auth-register", 5, 3_600, email);
    if (!emailDeliveryConfigured()) {
      return NextResponse.json({ error: "ההרשמה אינה זמינה כרגע כי שירות אימות הדוא״ל אינו מחובר. נסו שוב מאוחר יותר." }, { status: 503 });
    }
    stage = "password";
    const passwordRecord = await hashPassword(password);
    stage = "account";
    await db.prepare("INSERT OR IGNORE INTO users (email, display_name) VALUES (?, ?)").bind(email, displayName).run();
    const inserted = await db.prepare(
      "INSERT OR IGNORE INTO auth_credentials (email, password_hash, password_salt, password_iterations) VALUES (?, ?, ?, ?)",
    ).bind(email, passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations).run();
    if (!inserted.meta?.changes) return NextResponse.json({ error: "כבר קיים חשבון עם כתובת הדוא״ל הזו. אפשר להתחבר במקום." }, { status: 409 });
    await db.prepare("UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?").bind(displayName, email).run();
    await db.prepare("INSERT OR REPLACE INTO email_verifications (user_email, verified_at, updated_at) VALUES (?, NULL, CURRENT_TIMESTAMP)").bind(email).run();

    stage = "verification";
    const returnTo = safeReturnTo(body.returnTo);
    const verificationToken = await issueAuthToken(email, "verify_email", 86_400);
    const delivery = await sendAuthEmail({
      to: email,
      displayName,
      type: "verify_email",
      actionUrl: actionUrl(request, `/verify-email?returnTo=${encodeURIComponent(returnTo)}`, verificationToken),
    });

    stage = "session";
    const token = await createSession(email);
    const redirectTo = `/verify-email?${delivery.sent ? "sent=1" : "delivery=failed"}&returnTo=${encodeURIComponent(returnTo)}`;
    const response = NextResponse.json({ ok: true, redirectTo, verificationEmailSent: delivery.sent, verificationEmailStatus: delivery.sent ? "sent" : delivery.reason }, { status: 201 });
    response.headers.set("Set-Cookie", serializeSessionCookie(token));
    return response;
  } catch (error) {
    if (!(error instanceof RequestError)) {
      console.error(`Registration failed at ${stage}`, error);
      return NextResponse.json({ error: "אירעה שגיאה. נסו שוב בעוד רגע.", reference: `REGISTER-${stage.toUpperCase()}` }, { status: 500 });
    }
    return errorResponse(error);
  }
}
