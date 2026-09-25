import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { getProductUser, hashPassword } from "@/lib/auth";
import { canUsePagePassword } from "@/lib/plans";
import { projectFromRow } from "@/lib/projects";
import { enforceRateLimit, errorResponse, readJsonObject, RequestError, requireSameOrigin, validUuid } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל לפני הגדרת סיסמה לעמוד." }, { status: 403 });
    const { id } = await context.params;
    if (!validUuid(id)) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
    const body = await readJsonObject(request, 2_048);
    const remove = body.remove === true;
    const password = typeof body.password === "string" ? body.password.normalize("NFC") : "";
    if (!remove && (Array.from(password).length < 6 || Array.from(password).length > 64)) {
      throw new RequestError(400, "הסיסמה לעמוד צריכה להכיל 6–64 תווים.");
    }
    if (!remove && !canUsePagePassword(user.plan)) {
      return NextResponse.json({ error: "סיסמת כניסה כלולה במסלול Max ומעלה", code: "plan_limit", feature: "pagePassword" }, { status: 403 });
    }
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "project-password", 12, 900, user.email);
    const current = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
    if (!current) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
    const passwordHash = remove ? null : (await hashPassword(password)).hash;
    await db.prepare("UPDATE projects SET access_password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_email = ?")
      .bind(passwordHash, id, user.email).run();
    const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
    return NextResponse.json({ project: projectFromRow(row) });
  } catch (error) {
    return errorResponse(error);
  }
}
