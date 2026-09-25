import { ensureDatabase } from "@/db";
import { hashAuthToken, randomToken } from "@/lib/auth";
import { assertAccountDeletable, tombstoneBilling } from "@/lib/billing";
import { canonicalOrigin } from "@/lib/site";

export type AuthTokenPurpose = "verify_email" | "reset_password" | "change_password" | "delete_account";

export async function issueAuthToken(email: string, purpose: AuthTokenPurpose, lifetimeSeconds: number, payload?: string) {
  const token = randomToken();
  const tokenHash = await hashAuthToken(token);
  const now = Math.floor(Date.now() / 1000);
  const db = await ensureDatabase();
  await db.batch([
    db.prepare("DELETE FROM auth_tokens WHERE user_email = ? AND purpose = ? AND used_at IS NULL").bind(email, purpose),
    db.prepare("INSERT INTO auth_tokens (token_hash, user_email, purpose, expires_at, payload) VALUES (?, ?, ?, ?, ?)")
      .bind(tokenHash, email, purpose, now + lifetimeSeconds, payload || null),
  ]);
  if (Math.random() < 0.03) await db.prepare("DELETE FROM auth_tokens WHERE expires_at < ?").bind(now - 86_400).run();
  return token;
}

export function actionUrl(request: Request, path: string, token: string) {
  const url = new URL(path, canonicalOrigin(request.url));
  url.searchParams.set("token", token);
  return url.toString();
}

export function developmentActionUrl(request: Request, path: string, token: string) {
  const hostname = new URL(request.url).hostname;
  if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1", "::1"].includes(hostname)) return "";
  return actionUrl(request, path, token);
}

export async function peekAuthToken(token: string) {
  if (!/^[0-9a-f]{64}$/i.test(token)) return null;
  const tokenHash = await hashAuthToken(token);
  const now = Math.floor(Date.now() / 1000);
  const db = await ensureDatabase();
  const record = await db.prepare(
    "SELECT user_email, purpose, expires_at FROM auth_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
  ).bind(tokenHash, now).first();
  if (!record) return null;
  return {
    email: String(record.user_email),
    purpose: String(record.purpose) as AuthTokenPurpose,
    expiresAt: Number(record.expires_at),
  };
}

/**
 * Claims a one-time token atomically: the single UPDATE both checks and marks the token used,
 * so concurrent requests carrying the same token can never both succeed.
 */
export async function claimAuthToken(db: any, token: string, purpose: AuthTokenPurpose) {
  if (!/^[0-9a-f]{64}$/i.test(token)) return null;
  const tokenHash = await hashAuthToken(token);
  const now = Math.floor(Date.now() / 1000);
  const record = await db.prepare(
    `UPDATE auth_tokens SET used_at = ?
     WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?
     RETURNING user_email, payload`,
  ).bind(now, tokenHash, purpose, now).first();
  if (!record) return null;
  await db.prepare("DELETE FROM auth_tokens WHERE user_email = ? AND purpose = ? AND token_hash <> ?")
    .bind(record.user_email, purpose, tokenHash).run();
  return {
    email: String(record.user_email),
    payload: typeof record.payload === "string" ? record.payload : "",
  };
}

export async function consumeAuthToken(token: string, purpose: AuthTokenPurpose) {
  const db = await ensureDatabase();
  return claimAuthToken(db, token, purpose);
}

export async function deleteOwnedAccount(email: string) {
  const db = await ensureDatabase();
  await assertAccountDeletable(db, email);
  const target = await db.prepare(
    `SELECT users.email, users.plan,
      COUNT(projects.id) AS project_count,
      COALESCE(SUM(CASE WHEN projects.published = 1 THEN 1 ELSE 0 END), 0) AS published_count
     FROM users LEFT JOIN projects ON projects.owner_email = users.email
     WHERE users.email = ? GROUP BY users.email, users.plan`,
  ).bind(email).first();
  if (!target) return null;
  await tombstoneBilling(db, email);
  await db.batch([
    db.prepare("DELETE FROM login_aliases WHERE user_email = ?").bind(email),
    db.prepare("DELETE FROM auth_tokens WHERE user_email = ?").bind(email),
    db.prepare("DELETE FROM email_verifications WHERE user_email = ?").bind(email),
    db.prepare("DELETE FROM sessions WHERE user_email = ?").bind(email),
    db.prepare("DELETE FROM auth_credentials WHERE email = ?").bind(email),
    db.prepare("DELETE FROM user_controls WHERE email = ?").bind(email),
    db.prepare("DELETE FROM project_backgrounds WHERE project_id IN (SELECT id FROM projects WHERE owner_email = ?)").bind(email),
    db.prepare("DELETE FROM project_emoji_images WHERE project_id IN (SELECT id FROM projects WHERE owner_email = ?)").bind(email),
    db.prepare("DELETE FROM rsvp_responses WHERE project_id IN (SELECT id FROM projects WHERE owner_email = ?)").bind(email),
    db.prepare("DELETE FROM projects WHERE owner_email = ?").bind(email),
    db.prepare("DELETE FROM marketing_leads WHERE email = ?").bind(email),
    db.prepare("UPDATE marketing_events SET user_email = NULL WHERE user_email = ?").bind(email),
    db.prepare("DELETE FROM users WHERE email = ?").bind(email),
  ]);
  return {
    email,
    plan: target.plan,
    projectCount: Number(target.project_count || 0),
    publishedCount: Number(target.published_count || 0),
  };
}
