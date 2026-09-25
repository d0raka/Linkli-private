import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { createSession, hashPassword, serializeSessionCookie, validatePassword } from "@/lib/auth";
import { claimAuthToken, peekAuthToken } from "@/lib/account-security";
import { errorResponse, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";

const INVALID_LINK = "קישור האיפוס אינו תקף או שפג תוקפו.";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 4_096);
    const token = typeof body.token === "string" && /^[0-9a-f]{64}$/i.test(body.token) ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!token) throw new RequestError(400, "קישור האיפוס אינו תקין.");
    // Validate the new password before the token is spent so a typo does not burn the link.
    const preview = await peekAuthToken(token);
    if (!preview || preview.purpose !== "reset_password") throw new RequestError(400, INVALID_LINK);
    const passwordError = validatePassword(password, preview.email);
    if (passwordError) throw new RequestError(400, passwordError);
    const passwordRecord = await hashPassword(password);

    const db = await ensureDatabase();
    const claimed = await claimAuthToken(db, token, "reset_password");
    if (!claimed) throw new RequestError(400, INVALID_LINK);
    const email = claimed.email;
    await db.batch([
      db.prepare("UPDATE auth_credentials SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?")
        .bind(passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations, email),
      db.prepare("DELETE FROM sessions WHERE user_email = ?").bind(email),
    ]);
    const sessionToken = await createSession(email);
    const response = NextResponse.json({ ok: true, redirectTo: "/studio" });
    response.headers.set("Set-Cookie", serializeSessionCookie(sessionToken));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
