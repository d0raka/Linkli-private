import { isPaidPlan } from "@/lib/plans";

export const REFERRAL_COOKIE = "linkli_ref";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomHex(size = 8) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function referralCodeFromToken(token = randomHex(8)) {
  const bytes = token.replace(/[^0-9a-f]/gi, "a").padEnd(12, "a");
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    const value = Number.parseInt(bytes.slice(index * 2, index * 2 + 2), 16) || index;
    code += CODE_ALPHABET[value % CODE_ALPHABET.length];
  }
  return code;
}

export function sanitizeReferralCode(value: unknown) {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9]{6,12}$/.test(raw) ? raw : "";
}

export function referralCodeFromCookieHeader(cookieHeader: string | null | undefined) {
  const match = String(cookieHeader || "").match(/(?:^|;\s*)linkli_ref=([A-Za-z0-9]{6,12})/);
  return sanitizeReferralCode(match?.[1] || "");
}

export async function ensureReferralCode(db: any, email: string) {
  const row = await db.prepare("SELECT referral_code FROM users WHERE email = ?").bind(email).first();
  const existing = sanitizeReferralCode(row?.referral_code);
  if (existing) return existing;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = referralCodeFromToken();
    try {
      await db.prepare("UPDATE users SET referral_code = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ? AND (referral_code IS NULL OR TRIM(referral_code) = '')")
        .bind(code, email).run();
    } catch {
      continue;
    }
    const saved = await db.prepare("SELECT referral_code FROM users WHERE email = ?").bind(email).first();
    const next = sanitizeReferralCode(saved?.referral_code);
    if (next) return next;
  }
  return "";
}

export async function findReferrerEmail(db: any, code: string, excludeEmail: string) {
  const clean = sanitizeReferralCode(code);
  if (!clean) return null;
  const row = await db.prepare("SELECT email FROM users WHERE referral_code = ?").bind(clean).first();
  const email = typeof row?.email === "string" ? row.email : "";
  if (!email || email === excludeEmail) return null;
  return email;
}

export async function rewardReferralIfNeeded(db: any, buyerEmail: string, nextPlan: string) {
  if (!isPaidPlan(nextPlan)) return;
  const claimed = await db.prepare(
    `UPDATE users SET referral_rewarded = 1, updated_at = CURRENT_TIMESTAMP
     WHERE email = ? AND referral_rewarded = 0 AND TRIM(COALESCE(referred_by, '')) <> ''
     RETURNING referred_by`,
  ).bind(buyerEmail).first();
  const referrerCode = sanitizeReferralCode(claimed?.referred_by);
  if (!referrerCode) return;
  const referrer = await db.prepare("SELECT email FROM users WHERE referral_code = ?").bind(referrerCode).first();
  const referrerEmail = typeof referrer?.email === "string" ? referrer.email : "";
  if (!referrerEmail || referrerEmail === buyerEmail) {
    await db.prepare("UPDATE users SET referral_rewarded = 0, updated_at = CURRENT_TIMESTAMP WHERE email = ? AND referral_rewarded = 1")
      .bind(buyerEmail).run();
    return;
  }
  await db.prepare("UPDATE users SET bonus_pages = COALESCE(bonus_pages, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE email = ?")
    .bind(referrerEmail).run();
}
