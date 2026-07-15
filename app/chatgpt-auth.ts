import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeEmail } from "@/lib/security";

export type ProductUser = { email: string; displayName: string };

export async function getProductUser(): Promise<ProductUser | null> {
  const requestHeaders = await headers();
  const email = normalizeEmail(requestHeaders.get("oai-authenticated-user-email"));
  if (email) {
    const encodedName = requestHeaders.get("oai-authenticated-user-full-name");
    const encoding = requestHeaders.get("oai-authenticated-user-full-name-encoding");
    let displayName = email.split("@")[0];
    if (encodedName && encoding === "percent-encoded-utf-8") {
      try { displayName = decodeURIComponent(encodedName); } catch { /* use email fallback */ }
    }
    return { email, displayName: displayName.trim().slice(0, 80) || email.split("@")[0] };
  }

  if (process.env.NODE_ENV === "development") {
    return { email: "demo@linkli.app", displayName: "משתמש/ת לדוגמה" };
  }
  return null;
}

export async function requireProductUser(returnTo = "/studio") {
  const user = await getProductUser();
  if (user) return user;
  redirect(`/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`);
}

export async function ensureUserRecord(user: ProductUser) {
  const { ensureDatabase } = await import("@/db");
  const db = await ensureDatabase();
  await db.prepare(
    `INSERT INTO users (email, display_name) VALUES (?, ?)
     ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name, updated_at = CURRENT_TIMESTAMP`
  ).bind(user.email, user.displayName).run();
  return db.prepare("SELECT email, display_name, plan FROM users WHERE email = ?").bind(user.email).first();
}
