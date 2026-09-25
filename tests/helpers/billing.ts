import { TEST_ENV } from "../setup/db";
import { jsonRequest } from "./requests";

const encoder = new TextEncoder();

export async function signWebhookBody(body: Record<string, unknown>, secret = TEST_ENV.BILLING_WEBHOOK_SECRET) {
  const rawBody = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
  const signature = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { rawBody, timestamp, signature };
}

export async function webhookRequest(body: Record<string, unknown>, options: { secret?: string; timestamp?: string; signature?: string } = {}) {
  const signed = await signWebhookBody(body, options.secret);
  return jsonRequest("/api/billing/webhook", {
    rawBody: signed.rawBody,
    headers: {
      "x-linkli-timestamp": options.timestamp ?? signed.timestamp,
      "x-linkli-signature": options.signature ?? signed.signature,
    },
  });
}

export function paidEvent(email: string, extra: Record<string, unknown> = {}) {
  return {
    eventId: `evt_${Math.random().toString(36).slice(2, 12)}`,
    type: "paid",
    email,
    priceId: "linkli-pro",
    occurredAt: new Date().toISOString(),
    sequence: 1,
    ...extra,
  };
}
