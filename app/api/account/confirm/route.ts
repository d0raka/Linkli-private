import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { consumeAuthToken, deleteOwnedAccount, peekAuthToken } from "@/lib/account-security";
import { deleteCurrentSession, isAdminEmail, serializeSessionCookie } from "@/lib/auth";
import { assertAccountDeletable } from "@/lib/billing";
import { errorResponse, normalizeEmail, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 2_048);
    const token = typeof body.token === "string" ? body.token : "";
    const purpose = body.purpose === "delete_account" ? "delete_account" : body.purpose === "change_password" ? "change_password" : "";
    if (!token || !purpose) throw new RequestError(400, "קישור האישור אינו תקין.");

    const preview = await peekAuthToken(token);
    if (!preview || preview.purpose !== purpose) {
      throw new RequestError(400, "קישור האישור אינו תקף, פג תוקפו או שכבר נעשה בו שימוש.");
    }

    if (purpose === "delete_account") {
      if (isAdminEmail(preview.email)) throw new RequestError(400, "אי אפשר למחוק חשבון מנהל.");
      if (normalizeEmail(body.confirmation) !== preview.email) {
        throw new RequestError(400, "כתובת הדוא״ל לאימות המחיקה אינה תואמת.");
      }
      const db = await ensureDatabase();
      await assertAccountDeletable(db, preview.email);
    }

    const consumed = await consumeAuthToken(token, purpose);
    if (!consumed) throw new RequestError(400, "קישור האישור אינו תקף, פג תוקפו או שכבר נעשה בו שימוש.");

    if (purpose === "change_password") {
      let payload: { hash?: unknown; salt?: unknown; iterations?: unknown } = {};
      try { payload = JSON.parse(consumed.payload || "{}"); } catch { payload = {}; }
      if (typeof payload.hash !== "string" || typeof payload.salt !== "string" || typeof payload.iterations !== "number") {
        throw new RequestError(400, "בקשת שינוי הסיסמה אינה תקינה. צריך להתחיל מחדש מההגדרות.");
      }
      const db = await ensureDatabase();
      await db.batch([
        db.prepare("UPDATE auth_credentials SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?")
          .bind(payload.hash, payload.salt, payload.iterations, consumed.email),
        db.prepare("DELETE FROM sessions WHERE user_email = ?").bind(consumed.email),
      ]);
      await deleteCurrentSession();
      const response = NextResponse.json({ ok: true, redirectTo: "/login?passwordChanged=1" });
      response.headers.set("Set-Cookie", serializeSessionCookie("", 0));
      return response;
    }

    const deleted = await deleteOwnedAccount(consumed.email);
    if (!deleted) throw new RequestError(404, "החשבון כבר אינו קיים.");
    await deleteCurrentSession();
    const response = NextResponse.json({ ok: true, redirectTo: "/login?accountDeleted=1" });
    response.headers.set("Set-Cookie", serializeSessionCookie("", 0));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
