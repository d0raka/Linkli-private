import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { actionUrl, developmentActionUrl, issueAuthToken } from "@/lib/account-security";
import { deleteCurrentSession, getProductUser, hashPassword, isAdminEmail, revokeOtherSessions, validatePassword, verifyPassword } from "@/lib/auth";
import { assertAccountDeletable } from "@/lib/billing";
import { sendAuthEmail } from "@/lib/email";
import { enforceRateLimit, errorResponse, normalizeEmail, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";
import { plainText } from "@/lib/text";

async function sensitiveEmailLink(request: Request, email: string, displayName: string, type: "change_password" | "delete_account", token: string) {
  const confirmUrl = actionUrl(request, "/account/confirm", token);
  const delivery = await sendAuthEmail({ to: email, displayName, type, actionUrl: confirmUrl });
  const localConfirmUrl = delivery.sent ? "" : developmentActionUrl(request, "/account/confirm", token);
  if (!delivery.sent && !localConfirmUrl) {
    throw new RequestError(503, "שירות הדוא״ל אינו זמין כרגע. אפשר לנסות שוב בעוד כמה דקות.");
  }
  return localConfirmUrl;
}

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
      await enforceRateLimit(db, request, "account-password-email", 3, 3_600, user.email);
      const credential = await db.prepare(
        "SELECT password_hash, password_salt, password_iterations FROM auth_credentials WHERE email = ?",
      ).bind(user.email).first();
      if (!(await verifyPassword(currentPassword, credential))) throw new RequestError(400, "הסיסמה הנוכחית אינה נכונה.");
      if (currentPassword === newPassword) throw new RequestError(400, "הסיסמה החדשה צריכה להיות שונה מהסיסמה הנוכחית.");
      const passwordRecord = await hashPassword(newPassword);
      const token = await issueAuthToken(user.email, "change_password", 1_800, JSON.stringify(passwordRecord));
      const localConfirmUrl = await sensitiveEmailLink(request, user.email, user.displayName, "change_password", token);
      return NextResponse.json({
        ok: true,
        pending: true,
        message: "שלחנו קישור אישור לכתובת הדוא״ל. הסיסמה תשתנה רק אחרי הלחיצה שם.",
        ...(localConfirmUrl ? { localConfirmUrl } : {}),
      });
    }

    if (action === "revoke_sessions") {
      const removed = await revokeOtherSessions();
      return NextResponse.json({
        ok: true,
        removed,
        message: removed ? "התנתקנו מכל המכשירים האחרים. המכשיר הזה נשאר מחובר." : "אין מכשירים אחרים מחוברים.",
      });
    }

    if (action === "delete_request") {
      if (isAdminEmail(user.email)) throw new RequestError(400, "אי אפשר למחוק חשבון מנהל מההגדרות.");
      if (normalizeEmail(body.confirmation) !== user.email) {
        throw new RequestError(400, "כתובת הדוא״ל לאימות המחיקה אינה תואמת.");
      }
      const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
      const credential = await db.prepare(
        "SELECT password_hash, password_salt, password_iterations FROM auth_credentials WHERE email = ?",
      ).bind(user.email).first();
      if (!(await verifyPassword(currentPassword, credential))) throw new RequestError(400, "הסיסמה אינה נכונה.");
      await assertAccountDeletable(db, user.email);
      await enforceRateLimit(db, request, "account-delete-email", 2, 3_600, user.email);
      const token = await issueAuthToken(user.email, "delete_account", 1_800);
      const localConfirmUrl = await sensitiveEmailLink(request, user.email, user.displayName, "delete_account", token);
      return NextResponse.json({
        ok: true,
        pending: true,
        message: "שלחנו קישור אישור לכתובת הדוא״ל. המחיקה תתבצע רק אחרי האישור משם.",
        ...(localConfirmUrl ? { localConfirmUrl } : {}),
      });
    }

    throw new RequestError(400, "הפעולה שביקשת אינה נתמכת.");
  } catch (error) {
    return errorResponse(error);
  }
}
