import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { createSession, hashAuthToken, hashPassword, serializeSessionCookie, validatePassword } from "@/lib/auth";
import { errorResponse, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 4_096);
    const token = typeof body.token === "string" && /^[0-9a-f]{64}$/i.test(body.token) ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!token) throw new RequestError(400, "קישור האיפוס אינו תקין.");
    const tokenHash = await hashAuthToken(token);
    const now = Math.floor(Date.now() / 1000);
    const db = await ensureDatabase();
    const record = await db.prepare(
      "SELECT user_email FROM auth_tokens WHERE token_hash = ? AND purpose = 'reset_password' AND used_at IS NULL AND expires_at > ?",
    ).bind(tokenHash, now).first();
    if (!record) throw new RequestError(400, "קישור האיפוס אינו תקף או שפג תוקפו.");
    const email = String(record.user_email);
    const passwordError = validatePassword(password, email);
    if (passwordError) throw new RequestError(400, passwordError);
    const passwordRecord = await hashPassword(password);
    await db.batch([
      db.prepare("UPDATE auth_credentials SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?")
        .bind(passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations, email),
      db.prepare("UPDATE auth_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL").bind(now, tokenHash),
      db.prepare("DELETE FROM auth_tokens WHERE user_email = ? AND purpose = 'reset_password' AND token_hash <> ?").bind(email, tokenHash),
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
