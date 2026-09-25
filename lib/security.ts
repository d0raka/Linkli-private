import { NextResponse } from "next/server";

const encoder = new TextEncoder();

export class RequestError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof RequestError) {
    return NextResponse.json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, { status: error.status });
  }
  console.error("Unhandled request error", error);
  return NextResponse.json({ error: "אירעה שגיאה. נסו שוב בעוד רגע." }, { status: 500 });
}

export function requireSameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") throw new RequestError(403, "הבקשה נחסמה מטעמי אבטחה");

  const origin = request.headers.get("origin");
  if (!origin) {
    if (fetchSite !== "same-origin") throw new RequestError(403, "לא ניתן לאמת את מקור הבקשה");
    return;
  }
  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    throw new RequestError(400, "בקשה לא תקינה");
  }
  if (origin !== requestOrigin) throw new RequestError(403, "הבקשה נחסמה מטעמי אבטחה");
}

export async function readJsonObject(request: Request, maxBytes = 16_384): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new RequestError(415, "יש לשלוח JSON תקין");
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new RequestError(413, "הבקשה גדולה מדי");

  const raw = await request.text();
  if (encoder.encode(raw).byteLength > maxBytes) throw new RequestError(413, "הבקשה גדולה מדי");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new RequestError(400, "יש לשלוח JSON תקין");
  }
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "";
  return email;
}

export function normalizeUsername(value: unknown) {
  if (typeof value !== "string") return "";
  const username = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) ? username : "";
}

export function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validSlug(value: string) {
  return /^[a-z0-9][a-z0-9-]{0,49}$/.test(value);
}

function clientIdentifier(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function enforceRateLimit(
  db: any,
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds: number,
  subject?: string,
  scope: "both" | "ip" | "subject" = "both",
) {
  const source = scope === "ip"
    ? clientIdentifier(request)
    : scope === "subject"
      ? subject || "unknown"
      : `${subject ? `${subject}:` : ""}${clientIdentifier(request)}`;
  const identifier = await sha256(`${bucket}:${source}`);
  const key = `${bucket}:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const resetAt = now + windowSeconds;
  await db.prepare(
    `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
       reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END`,
  ).bind(key, resetAt, now, now).run();
  const row = await db.prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?").bind(key).first();
  if (Number(row?.count || 0) > limit) {
    const retryAfter = Math.max(1, Number(row?.reset_at || resetAt) - now);
    throw new RequestError(429, `יותר מדי ניסיונות. נסו שוב בעוד ${retryAfter} שניות.`);
  }

  if (Math.random() < 0.01) {
    await db.prepare("DELETE FROM rate_limits WHERE reset_at < ?").bind(now - 86_400).run();
  }
}

function constantTimeEqual(left: string, right: string) {
  const a = encoder.encode(left.toLowerCase());
  const b = encoder.encode(right.toLowerCase());
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}

export async function verifyWebhookSignature(rawBody: string, timestamp: string | null, signature: string | null, secret: string) {
  if (!timestamp || !signature || !/^\d{10,13}$/.test(timestamp)) return false;
  const timestampSeconds = timestamp.length === 13 ? Math.floor(Number(timestamp) / 1000) : Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > 300) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
  const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const supplied = signature.replace(/^sha256=/i, "");
  return /^[0-9a-f]{64}$/i.test(supplied) && constantTimeEqual(expected, supplied);
}

export function safeHostedCheckoutUrl(value: string, request: Request) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RequestError(503, "קישור התשלום אינו מוגדר בצורה תקינה");
  }
  const localDevelopment = process.env.NODE_ENV === "development" && ["http:", "https:"].includes(url.protocol);
  if ((!localDevelopment && url.protocol !== "https:") || url.username || url.password) {
    throw new RequestError(503, "קישור התשלום אינו מאובטח");
  }
  if (url.origin === new URL(request.url).origin) throw new RequestError(503, "קישור התשלום חייב להפנות לספק סליקה חיצוני");
  return url;
}
