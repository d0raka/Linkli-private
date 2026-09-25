import { runtimeValue } from "@/db";
import { RequestError } from "@/lib/security";

export type PaypalCanonicalType = "paid" | "refunded";

export type PaypalMappedEvent = {
  eventId: string;
  type: PaypalCanonicalType;
  orderId: string;
  occurredAt?: string;
  amountMinor?: number;
  currency?: string;
};

function paypalApiBase() {
  return runtimeValue("PAYPAL_ENVIRONMENT") === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asString(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function collectOrderIds(resource: Record<string, unknown>) {
  const ids = [
    asString(resource.custom_id),
    asString(resource.invoice_id),
    asString(asRecord(asRecord(resource.supplementary_data)?.related_ids)?.order_id),
  ];
  const units = Array.isArray(resource.purchase_units) ? resource.purchase_units : [];
  for (const unit of units) {
    const row = asRecord(unit);
    if (!row) continue;
    ids.push(asString(row.custom_id), asString(row.invoice_id));
    const captures = asRecord(row.payments)?.captures;
    if (!Array.isArray(captures)) continue;
    for (const capture of captures) {
      const item = asRecord(capture);
      if (item) ids.push(asString(item.custom_id), asString(item.invoice_id));
    }
  }
  return [...new Set(ids.filter(Boolean))];
}

function amountMinor(resource: Record<string, unknown>) {
  const amount = asRecord(resource.amount) || asRecord(asRecord(resource.purchase_units && Array.isArray(resource.purchase_units) ? resource.purchase_units[0] : null)?.amount);
  const value = asString(amount?.value, 20);
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.round(parsed * 100);
}

export function mapPaypalWebhookEvent(body: Record<string, unknown>): PaypalMappedEvent | null {
  const eventType = asString(body.event_type || body.eventType, 80).toUpperCase();
  const type: PaypalCanonicalType | "" = eventType === "PAYMENT.CAPTURE.COMPLETED"
    || eventType === "PAYMENT.SALE.COMPLETED"
    || eventType === "CHECKOUT.ORDER.COMPLETED"
    ? "paid"
    : /REFUND/.test(eventType) ? "refunded" : "";
  if (!type) return null;
  const resource = asRecord(body.resource) || {};
  const eventId = asString(body.id || resource.id, 128);
  const orderId = collectOrderIds(resource)[0] || "";
  if (!eventId || eventId.length < 8 || !orderId) return null;
  return {
    eventId,
    type,
    orderId,
    occurredAt: asString(body.create_time || resource.create_time, 40) || undefined,
    amountMinor: amountMinor(resource),
    currency: asString(asRecord(resource.amount)?.currency_code, 8) || "ILS",
  };
}

async function paypalAccessToken() {
  const clientId = runtimeValue("PAYPAL_CLIENT_ID");
  const secret = runtimeValue("PAYPAL_CLIENT_SECRET");
  if (!clientId || !secret) throw new RequestError(503, "PayPal webhook is not configured", "billing_unavailable");
  const response = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new RequestError(502, "PayPal authentication failed");
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new RequestError(502, "PayPal authentication failed");
  return data.access_token;
}

export async function verifyPaypalWebhookSignature(rawBody: string, headers: Headers) {
  const webhookId = runtimeValue("PAYPAL_WEBHOOK_ID");
  if (!webhookId) throw new RequestError(503, "PayPal webhook is not configured", "billing_unavailable");
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw new RequestError(400, "Invalid payload");
  }
  const token = await paypalAccessToken();
  const response = await fetch(`${paypalApiBase()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo") || "",
      cert_url: headers.get("paypal-cert-url") || "",
      transmission_id: headers.get("paypal-transmission-id") || "",
      transmission_sig: headers.get("paypal-transmission-sig") || "",
      transmission_time: headers.get("paypal-transmission-time") || "",
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  if (!response.ok) throw new RequestError(401, "Unauthorized");
  const data = await response.json() as { verification_status?: string };
  if (data.verification_status !== "SUCCESS") throw new RequestError(401, "Unauthorized");
  return event;
}
