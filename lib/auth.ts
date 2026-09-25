import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { ensureDatabase, runtimeValue } from "@/db";
import { normalizePlan, type PlanType } from "@/lib/plans";

const BCRYPT_COST = 12;
const SESSION_SECONDS = 60 * 60 * 24 * 30;
/** Admin sessions are short-lived regardless of activity. */
const ADMIN_SESSION_SECONDS = 60 * 60 * 12;
/** Sliding expiry is refreshed at most this often to keep session writes cheap. */
const SESSION_TOUCH_INTERVAL_SECONDS = 60 * 10;
const encoder = new TextEncoder();
const DUMMY_BCRYPT_HASH = "$2b$12$k3wtwobnSkXHia/YhSDUTuoi05UmQd9SDg6WvNhxqtbGq/p7VtX02";

export type ProductUser = {
  email: string;
  displayName: string;
  plan: PlanType;
  bonusPages: number;
  isAdmin: boolean;
  emailVerified: boolean;
};

const DEVELOPMENT_ADMIN_EMAIL = "dor.aka.inbox@gmail.com";

export function isAdminEmail(email: string) {
  const configured = runtimeValue("ADMIN_EMAILS") || (process.env.NODE_ENV === "development" ? DEVELOPMENT_ADMIN_EMAIL : "");
  return configured.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean).includes(email.trim().toLowerCase());
}

const commonPasswords = new Set([
  "passwordpassword", "password123456", "123456789012345", "qwertyuiop12345",
  "letmeinletmein", "iloveyouiloveyou", "linklilinkli", "adminadminadmin",
]);

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function hashAuthToken(value: string) {
  return sha256(value);
}

async function pepperPassword(password: string) {
  const pepper = runtimeValue("AUTH_PEPPER") || (process.env.NODE_ENV === "development" ? "linkli-local-development-pepper" : null);
  if (!pepper) throw new Error("Authentication pepper is unavailable");
  const key = await crypto.subtle.importKey("raw", encoder.encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(password.normalize("NFC")));
  return bytesToHex(new Uint8Array(digest));
}

export function validatePassword(password: unknown, email: string) {
  if (typeof password !== "string") return "יש להזין סיסמה";
  const normalized = password.normalize("NFC");
  const length = Array.from(normalized).length;
  if (length < 15) return "הסיסמה צריכה להכיל לפחות 15 תווים. משפט קצר שקל לזכור הוא בחירה טובה.";
  if (length > 128) return "הסיסמה יכולה להכיל עד 128 תווים";
  const lowered = normalized.toLocaleLowerCase("en-US");
  const localPart = email.split("@")[0]?.toLocaleLowerCase("en-US") || "";
  if (commonPasswords.has(lowered) || (localPart.length >= 5 && lowered.includes(localPart))) {
    return "הסיסמה קלה מדי לניחוש. בחרו משפט ארוך שאינו כולל את כתובת הדוא״ל.";
  }
  return null;
}

export async function hashPassword(password: string) {
  return {
    hash: await bcrypt.hash(await pepperPassword(password), BCRYPT_COST),
    salt: "bcrypt-hmac-sha256",
    iterations: BCRYPT_COST,
  };
}

export async function verifyPassword(password: string, credential?: { password_hash?: unknown; password_salt?: unknown; password_iterations?: unknown } | null) {
  const hash = typeof credential?.password_hash === "string" && /^\$2[aby]\$\d{2}\$/.test(credential.password_hash)
    ? credential.password_hash
    : DUMMY_BCRYPT_HASH;
  const valid = await bcrypt.compare(await pepperPassword(password), hash);
  return hash !== DUMMY_BCRYPT_HASH && valid;
}

const RETURN_TO_PATHS = ["/studio", "/studio/create", "/account", "/checkout", "/paywall", "/admin"];

/**
 * Query parameters that may survive a login/registration round trip. Everything else is dropped:
 * returnTo ends up in emails, logs and browser history, so it must never carry personal content.
 */
const RETURN_TO_PARAMS: Record<string, RegExp> = {
  template: /^[a-z0-9-]{1,50}$/,
  draft: /^[A-Za-z0-9_-]{1,64}$/,
  edit: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  plan: /^(pro|max|business|plus)$/,
};

export function safeReturnTo(value: unknown, fallback = "/studio") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://linkli.local");
    if (!RETURN_TO_PATHS.includes(url.pathname)) return fallback;
    const params = new URLSearchParams();
    for (const [key, pattern] of Object.entries(RETURN_TO_PARAMS)) {
      const candidate = url.searchParams.get(key);
      if (candidate && pattern.test(candidate)) params.set(key, candidate);
    }
    const search = params.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`;
  } catch {
    return fallback;
  }
}

/** `sessions.created_at` is a SQLite CURRENT_TIMESTAMP text ("YYYY-MM-DD HH:MM:SS", UTC). */
function sessionAgeSeconds(createdAt: unknown, now: number) {
  if (typeof createdAt !== "string" || !createdAt) return 0;
  const parsed = Date.parse(createdAt.includes("T") ? createdAt : `${createdAt.replace(" ", "T")}Z`);
  if (!Number.isFinite(parsed)) return 0;
  return now - Math.floor(parsed / 1000);
}

function cookieNames() {
  return process.env.NODE_ENV === "development" ? ["linkli_session", "__Host-linkli_session"] : ["__Host-linkli_session"];
}

export function serializeSessionCookie(token: string, maxAge = SESSION_SECONDS) {
  const name = process.env.NODE_ENV === "development" ? "linkli_session" : "__Host-linkli_session";
  const secure = process.env.NODE_ENV === "development" ? "" : "; Secure";
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0, maxAge)}${secure}`;
}

export async function createSession(email: string) {
  const token = randomToken();
  const id = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_SECONDS;
  const db = await ensureDatabase();
  await db.prepare("INSERT INTO sessions (id, user_email, expires_at, last_seen_at) VALUES (?, ?, ?, ?)")
    .bind(id, email, expiresAt, now).run();
  if (Math.random() < 0.02) await db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now).run();
  return token;
}

async function currentSessionToken() {
  const store = await cookies();
  for (const name of cookieNames()) {
    const value = store.get(name)?.value;
    if (value && /^[0-9a-f]{64}$/i.test(value)) return value;
  }
  return null;
}

export async function getProductUser(): Promise<ProductUser | null> {
  const token = await currentSessionToken();
  if (!token) return null;
  const id = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const db = await ensureDatabase();
  const row = await db.prepare(
    `SELECT users.email, users.display_name, users.plan, users.plan_tier, users.bonus_pages,
       sessions.created_at AS session_created_at, sessions.last_seen_at AS session_last_seen_at,
       COALESCE(user_controls.status, 'active') AS account_status,
       CASE WHEN email_verifications.verified_at IS NOT NULL THEN 1 ELSE 0 END AS email_verified
     FROM sessions JOIN users ON users.email = sessions.user_email
     LEFT JOIN user_controls ON user_controls.email = users.email
     LEFT JOIN email_verifications ON email_verifications.user_email = users.email
     WHERE sessions.id = ? AND sessions.expires_at > ?`,
  ).bind(id, now).first();
  if (!row || row.account_status === "suspended") return null;
  const admin = isAdminEmail(String(row.email));
  if (admin && sessionAgeSeconds(row.session_created_at, now) > ADMIN_SESSION_SECONDS) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
    return null;
  }
  if (now - Number(row.session_last_seen_at || 0) > SESSION_TOUCH_INTERVAL_SECONDS) {
    await db.prepare("UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?").bind(now, now + SESSION_SECONDS, id).run();
  }
  return {
    email: String(row.email),
    displayName: String(row.display_name),
    plan: normalizePlan(String(row.plan_tier || row.plan || "free")),
    bonusPages: Math.max(0, Number(row.bonus_pages || 0)),
    isAdmin: admin,
    emailVerified: Boolean(row.email_verified),
  };
}

export async function deleteCurrentSession() {
  const token = await currentSessionToken();
  if (!token) return;
  const db = await ensureDatabase();
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(await sha256(token)).run();
}

export async function revokeOtherSessions() {
  const token = await currentSessionToken();
  if (!token) return 0;
  const id = await sha256(token);
  const db = await ensureDatabase();
  const row = await db.prepare("SELECT user_email FROM sessions WHERE id = ?").bind(id).first();
  if (!row) return 0;
  const result = await db.prepare("DELETE FROM sessions WHERE user_email = ? AND id <> ?").bind(row.user_email, id).run();
  return Number(result.meta?.changes || 0);
}

export async function requireProductUser(returnTo = "/studio") {
  const user = await getProductUser();
  const safeDestination = safeReturnTo(returnTo);
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(safeDestination)}`);
  if (!user.emailVerified) redirect(`/verify-email?returnTo=${encodeURIComponent(safeDestination)}`);
  return user;
}

export async function getAdminUser() {
  const user = await getProductUser();
  return user?.isAdmin && user.emailVerified ? user : null;
}

export async function requireAdminUser() {
  const user = await getProductUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent("/admin")}`);
  if (!user.emailVerified) redirect(`/verify-email?returnTo=${encodeURIComponent("/admin")}`);
  if (!user.isAdmin) redirect("/studio");
  return user;
}
