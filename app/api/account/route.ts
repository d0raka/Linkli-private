import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { deleteCurrentSession, getProductUser, hashPassword, validatePassword, verifyPassword } from "@/lib/auth";
import { enforceRateLimit, errorResponse, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";
import { plainText } from "@/lib/text";

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) throw new RequestError(401, "יש להתחבר לחשבון כדי לעדכן את הפרטים.");
    if (!user.emailVerified) throw new RequestError(403, "יש לאמת את כתובת הדוא״ל לפני עדכון החשבון.");
    const body = await readJsonObject(request, 4_096);
    const action = body.action;
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "account-update", 12, 900, user.email);

    if (action === "profile") {
      const displayName = plainText(body.displayName, 80, true);
      if (displayName.length < 2) throw new RequestError(400, "יש להזין שם באורך שני תווים לפחות.");
      await db.prepare("UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?").bind(displayName, user.email).run();
      return NextResponse.json({ ok: true, displayName });
    }

    if (action === "password") {
      const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
      const passwordError = validatePassword(newPassword, user.email);
      if (passwordError) throw new RequestError(400, passwordError);
      const credential = await db.prepare(
        "SELECT password_hash, password_salt, password_iterations FROM auth_credentials WHERE email = ?",
      ).bind(user.email).first();
      if (!(await verifyPassword(currentPassword, credential))) throw new RequestError(400, "הסיסמה הנוכחית אינה נכונה.");
      if (currentPassword === newPassword) throw new RequestError(400, "הסיסמה החדשה צריכה להיות שונה מהסיסמה הנוכחית.");
      const passwordRecord = await hashPassword(newPassword);
      await db.prepare(
        "UPDATE auth_credentials SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?",
      ).bind(passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations, user.email).run();
      await db.prepare("DELETE FROM sessions WHERE user_email = ?").bind(user.email).run();
      await deleteCurrentSession();
      return NextResponse.json({ ok: true, redirectTo: "/login?passwordChanged=1" });
    }

    throw new RequestError(400, "הפעולה שביקשת אינה נתמכת.");
  } catch (error) {
    return errorResponse(error);
  }
}
