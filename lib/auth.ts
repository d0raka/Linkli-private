import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureDatabase } from "@/db";

const PASSWORD_ITERATIONS = 600_000;
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();

export type ProductUser = {
  email: string;
  displayName: string;
  plan: "free" | "plus";
};

const commonPasswords = new Set([
  "passwordpassword", "password123456", "123456789012345", "qwertyuiop12345",
  "letmeinletmein", "iloveyouiloveyou", "linklilinkli", "adminadminadmin",
]);

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) throw new Error("Invalid credential encoding");
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password.normalize("NFC")), "PBKDF2", false, ["deriveBits"]);
  const portableSalt = Uint8Array.from(salt).buffer;
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: portableSalt, iterations }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

function constantTimeEqual(left: string, right: string) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
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
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return {
    hash: await derivePassword(password, salt, PASSWORD_ITERATIONS),
    salt: bytesToHex(salt),
    iterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyPassword(password: string, credential?: { password_hash?: unknown; password_salt?: unknown; password_iterations?: unknown } | null) {
  const validCredential = typeof credential?.password_hash === "string" && typeof credential?.password_salt === "string";
  const salt = validCredential ? hexToBytes(String(credential.password_salt)) : new Uint8Array(16);
  const iterations = validCredential ? Number(credential?.password_iterations || PASSWORD_ITERATIONS) : PASSWORD_ITERATIONS;
  const candidate = await derivePassword(password, salt, iterations);
  return validCredential && constantTimeEqual(candidate, String(credential.password_hash));
}

export function safeReturnTo(value: unknown, fallback = "/studio") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://linkli.local");
    if (!["/studio", "/checkout"].includes(url.pathname)) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
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
    `SELECT users.email, users.display_name, users.plan
     FROM sessions JOIN users ON users.email = sessions.user_email
     WHERE sessions.id = ? AND sessions.expires_at > ?`,
  ).bind(id, now).first();
  if (!row) return null;
  return {
    email: String(row.email),
    displayName: String(row.display_name),
    plan: row.plan === "plus" ? "plus" : "free",
  };
}

export async function deleteCurrentSession() {
  const token = await currentSessionToken();
  if (!token) return;
  const db = await ensureDatabase();
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(await sha256(token)).run();
}

export async function requireProductUser(returnTo = "/studio") {
  const user = await getProductUser();
  if (user) return user;
  redirect(`/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
}
