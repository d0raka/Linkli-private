import { cookies } from "next/headers";
import { runtimeValue } from "@/db";

const ACCESS_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

function accessSecret() {
  return runtimeValue("AUTH_PEPPER") || (process.env.NODE_ENV === "development" ? "linkli-local-development-pepper" : null);
}

function cookieName(slug: string) {
  return `${process.env.NODE_ENV === "development" ? "linkli_page_" : "__Host-linkli_page_"}${slug}`;
}

async function signature(slug: string, expiresAt: number) {
  const secret = accessSecret();
  if (!secret) throw new Error("Page access signing secret is unavailable");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${slug}.${expiresAt}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}

export async function hasPageAccess(slug: string) {
  const value = (await cookies()).get(cookieName(slug))?.value || "";
  const [expiresText, supplied] = value.split(".", 2);
  const expiresAt = Number(expiresText);
  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !/^[0-9a-f]{64}$/i.test(supplied || "")) return false;
  return constantTimeEqual(await signature(slug, expiresAt), supplied.toLowerCase());
}

export async function serializePageAccessCookie(slug: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_SECONDS;
  const value = `${expiresAt}.${await signature(slug, expiresAt)}`;
  const secure = process.env.NODE_ENV === "development" ? "" : "; Secure";
  return `${cookieName(slug)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ACCESS_SECONDS}${secure}`;
}
