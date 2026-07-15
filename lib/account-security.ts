import { ensureDatabase } from "@/db";
import { hashAuthToken, randomToken } from "@/lib/auth";

export type AuthTokenPurpose = "verify_email" | "reset_password";

export async function issueAuthToken(email: string, purpose: AuthTokenPurpose, lifetimeSeconds: number) {
  const token = randomToken();
  const tokenHash = await hashAuthToken(token);
  const now = Math.floor(Date.now() / 1000);
  const db = await ensureDatabase();
  await db.batch([
    db.prepare("DELETE FROM auth_tokens WHERE user_email = ? AND purpose = ? AND used_at IS NULL").bind(email, purpose),
    db.prepare("INSERT INTO auth_tokens (token_hash, user_email, purpose, expires_at) VALUES (?, ?, ?, ?)")
      .bind(tokenHash, email, purpose, now + lifetimeSeconds),
  ]);
  if (Math.random() < 0.03) await db.prepare("DELETE FROM auth_tokens WHERE expires_at < ?").bind(now - 86_400).run();
  return token;
}

export function actionUrl(request: Request, path: string, token: string) {
  const url = new URL(path, new URL(request.url).origin);
  url.searchParams.set("token", token);
  return url.toString();
}
