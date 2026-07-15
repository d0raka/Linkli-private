import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { hashAuthToken } from "@/lib/auth";
import { errorResponse, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 2_048);
    const token = typeof body.token === "string" && /^[0-9a-f]{64}$/i.test(body.token) ? body.token : "";
    if (!token) throw new RequestError(400, "קישור האימות אינו תקין.");
    const tokenHash = await hashAuthToken(token);
    const now = Math.floor(Date.now() / 1000);
    const db = await ensureDatabase();
    const record = await db.prepare(
      "SELECT user_email FROM auth_tokens WHERE token_hash = ? AND purpose = 'verify_email' AND used_at IS NULL AND expires_at > ?",
    ).bind(tokenHash, now).first();
    if (!record) throw new RequestError(400, "קישור האימות אינו תקף או שכבר נעשה בו שימוש.");
    await db.batch([
      db.prepare("UPDATE email_verifications SET verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_email = ?").bind(record.user_email),
      db.prepare("UPDATE auth_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL").bind(now, tokenHash),
      db.prepare("DELETE FROM auth_tokens WHERE user_email = ? AND purpose = 'verify_email' AND token_hash <> ?").bind(record.user_email, tokenHash),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
