import { runtimeValue } from "@/db";
import {
  PLAN_PRICES,
  billingPlanValue,
  catalogPrice,
  isPaidPlan,
  normalizePlan,
  pageLimit,
  parseCheckoutPlan,
  planFromPriceId,
  planFromUserRow,
  planRank,
  type PaidPlanType,
  type PlanType,
} from "@/lib/plans";
import { RequestError } from "@/lib/security";

const encoder = new TextEncoder();
const PAST_DUE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;
const EVENT_ID = /^[A-Za-z0-9_.:-]{8,128}$/;

export type BillingEventInput = {
  eventId: string;
  type?: string;
  status?: string;
  occurredAt?: string;
  sequence?: number;
  email: string;
  customerId?: string;
  orderId?: string;
  subscriptionId?: string;
  priceId?: string;
  plan?: string;
  amountMinor?: number;
  currency?: string;
  payload?: Record<string, unknown>;
};

export type ApplyBillingResult = {
  duplicate?: boolean;
  ignored?: boolean;
  plan: PlanType;
};

export type BillingStatus = {
  plan: PlanType;
  entitled: boolean;
  processing: boolean;
  pendingPlan: PaidPlanType | null;
  latestOrderStatus: string | null;
  hasActiveSubscription: boolean;
};

export type BillingMetrics = {
  payingCustomers: number;
  mrrMinor: number;
  oneTimeRevenueMinor: number;
};

type CanonicalType =
  | "paid"
  | "refunded"
  | "chargeback"
  | "subscription_active"
  | "past_due"
  | "cancel_scheduled"
  | "cancelled"
  | "expired";

type OrderRow = {
  id: string;
  user_email: string;
  plan: string;
  price_id: string | null;
  amount_minor: number;
  status: string;
};

type SubscriptionRow = {
  id: string;
  user_email: string;
  plan: string;
  price_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at: string | null;
  updated_at: string;
};

export function billingDemoMode() {
  if (process.env.NODE_ENV === "production") return false;
  const value = runtimeValue("BILLING_DEMO_MODE") || process.env.BILLING_DEMO_MODE || "";
  return value === "1" || value.toLowerCase() === "true";
}

export function availableCheckoutMethods(): Array<"card" | "paypal" | "bit"> {
  if (billingDemoMode()) return ["card", "paypal", "bit"];
  const methods: Array<"card" | "paypal" | "bit"> = [];
  if (runtimeValue("BILLING_PAYPAL_URL") || runtimeValue("BILLING_CHECKOUT_URL")) methods.push("paypal");
  if (runtimeValue("BILLING_CREDIT_CARD_URL")) methods.push("card");
  if (runtimeValue("BILLING_BIT_URL")) methods.push("bit");
  return methods;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function stateSecret() {
  return runtimeValue("BILLING_STATE_SECRET") || runtimeValue("BILLING_WEBHOOK_SECRET") || runtimeValue("AUTH_PEPPER") || "";
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}

export async function signBillingState(payload: Record<string, unknown>) {
  const secret = stateSecret();
  if (!secret) throw new RequestError(503, "לא ניתן לחתום על בקשת התשלום.");
  const json = JSON.stringify(payload);
  const body = bytesToBase64Url(encoder.encode(json));
  return `${body}.${await hmacHex(secret, body)}`;
}

export async function verifyBillingState<T extends Record<string, unknown>>(state: string | null | undefined): Promise<T | null> {
  if (!state || !state.includes(".")) return null;
  const secret = stateSecret();
  if (!secret) return null;
  const dot = state.lastIndexOf(".");
  const body = state.slice(0, dot);
  const signature = state.slice(dot + 1).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(signature)) return null;
  const expected = await hmacHex(secret, body);
  if (!constantTimeEqual(expected, signature)) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body)));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const exp = Number((parsed as { exp?: unknown }).exp);
    if (Number.isFinite(exp) && exp * 1000 < Date.now()) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

function asString(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asNumber(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function toIso(value?: string | null) {
  if (value) {
    const parsed = new Date(value.includes("T") ? value : value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function asTime(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function canonicalType(rawType: string, status: string, recurring: boolean): CanonicalType | "" {
  const token = `${rawType} ${status}`.toLowerCase().replace(/[.-]/g, "_");
  if (/\b(chargeback|dispute)\b/.test(token)) return "chargeback";
  if (/\brefund/.test(token)) return "refunded";
  if (/\bpast_due\b/.test(token) || /\bpayment_failed\b/.test(token)) return "past_due";
  if (/\bcancel_scheduled\b/.test(token)) return "cancel_scheduled";
  if (/\bexpir/.test(token)) return "expired";
  if (/\bcancel/.test(token)) return "cancelled";
  if (/\b(subscription_active|subscription_activated)\b/.test(token) || (recurring && /\bactive\b/.test(token))) return "subscription_active";
  if (/\b(paid|payment_succeeded|order_paid|charge_succeeded)\b/.test(token) || (!recurring && /\bactive\b/.test(token))) return "paid";
  if (recurring && /\b(created|updated|renew)\b/.test(token)) return "subscription_active";
  return "";
}

export function parseBillingPayload(body: Record<string, unknown>): BillingEventInput {
  const eventId = asString(body.eventId, 128);
  const email = asString(body.email, 254).toLowerCase();
  if (!EVENT_ID.test(eventId) || !email) throw new RequestError(400, "Invalid payload");
  const priceId = asString(body.priceId || body.price_id, 80);
  const plan = asString(body.plan, 40);
  const amount = asNumber(body.amountMinor ?? body.amount_minor ?? body.amount);
  return {
    eventId,
    type: asString(body.type, 80),
    status: asString(body.status, 40),
    occurredAt: asString(body.occurredAt || body.provider_event_at, 40) || undefined,
    sequence: asNumber(body.sequence) ?? undefined,
    email,
    customerId: asString(body.customerId || body.customer_id, 160) || undefined,
    orderId: asString(body.orderId || body.order_id, 80) || undefined,
    subscriptionId: asString(body.subscriptionId || body.subscription_id, 80) || undefined,
    priceId: priceId || undefined,
    plan: plan || undefined,
    amountMinor: amount == null ? undefined : Math.round(amount < 200 && amount % 1 !== 0 ? amount * 100 : amount),
    currency: asString(body.currency, 8) || "ILS",
    payload: body,
  };
}

function paidPlanFromEvent(event: BillingEventInput): PaidPlanType | null {
  return planFromPriceId(event.priceId) || (event.plan ? parseCheckoutPlan(event.plan) : null);
}

export async function effectivePlan(db: any, email: string, now = Date.now()): Promise<PlanType> {
  const [orders, subscriptions] = await Promise.all([
    db.prepare("SELECT id, user_email, plan, price_id, amount_minor, status FROM orders WHERE user_email = ?").bind(email).all(),
    db.prepare("SELECT id, user_email, plan, price_id, status, current_period_end, cancel_at, updated_at FROM subscriptions WHERE user_email = ?").bind(email).all(),
  ]);
  return planFromRecords(
    (orders?.results || []) as OrderRow[],
    (subscriptions?.results || []) as SubscriptionRow[],
    now,
  );
}

function subscriptionEntitled(row: SubscriptionRow, now: number) {
  if (row.status === "active") return true;
  if (row.status === "cancel_scheduled") {
    const end = asTime(row.cancel_at) || asTime(row.current_period_end);
    return !end || end >= now;
  }
  if (row.status === "past_due") {
    const graceFrom = asTime(row.current_period_end) || asTime(row.updated_at) || now;
    return now <= graceFrom + PAST_DUE_GRACE_MS;
  }
  return false;
}

function planFromRecords(orders: OrderRow[], subscriptions: SubscriptionRow[], now: number): PlanType {
  let best: PlanType = "free";
  for (const row of subscriptions) {
    if (!subscriptionEntitled(row, now)) continue;
    const plan = normalizePlan(row.plan);
    if (planRank(plan) > planRank(best)) best = plan;
  }
  for (const row of orders) {
    if (row.status !== "paid") continue;
    const plan = planFromPriceId(row.price_id) || normalizePlan(row.plan);
    if (plan === "business") continue;
    if (planRank(plan) > planRank(best)) best = plan;
  }
  return best;
}

export async function getBillingStatus(db: any, email: string): Promise<BillingStatus> {
  const plan = await effectivePlan(db, email);
  const pending = await db.prepare(
    "SELECT plan, status FROM orders WHERE user_email = ? ORDER BY created_at DESC LIMIT 1",
  ).bind(email).first();
  const blocking = await hasActiveSubscription(db, email);
  const latestOrderStatus = typeof pending?.status === "string" ? pending.status : null;
  const pendingPlan = latestOrderStatus === "pending" ? parseCheckoutPlan(pending?.plan) : null;
  return {
    plan,
    entitled: isPaidPlan(plan),
    processing: !isPaidPlan(plan) && latestOrderStatus === "pending",
    pendingPlan,
    latestOrderStatus,
    hasActiveSubscription: blocking,
  };
}

export async function hasActiveSubscription(db: any, email: string) {
  const row = await db.prepare(
    `SELECT id FROM subscriptions
     WHERE user_email = ? AND status IN ('active', 'past_due', 'cancel_scheduled')
     LIMIT 1`,
  ).bind(email).first();
  return Boolean(row);
}

export async function assertAccountDeletable(db: any, email: string) {
  if (await hasActiveSubscription(db, email)) {
    throw new RequestError(409, "יש לבטל את המנוי המתחדש לפני מחיקת החשבון. המחיקה לא מבטלת חיוב.", "subscription_active");
  }
}

export async function tombstoneBilling(db: any, email: string) {
  await db.prepare(
    `INSERT INTO billing_customers (user_email, provider, deleted_at)
     VALUES (?, 'hosted', CURRENT_TIMESTAMP)
     ON CONFLICT(user_email) DO UPDATE SET deleted_at = CURRENT_TIMESTAMP`,
  ).bind(email).run();
}

export async function billingMetrics(db: any, now = Date.now()): Promise<BillingMetrics> {
  const [subscriptions, orders] = await Promise.all([
    db.prepare("SELECT user_email, plan, price_id, status, current_period_end, cancel_at, updated_at FROM subscriptions").all(),
    db.prepare("SELECT user_email, plan, price_id, amount_minor, status FROM orders").all(),
  ]);
  const subRows = (subscriptions?.results || []) as SubscriptionRow[];
  const orderRows = (orders?.results || []) as OrderRow[];
  let mrrMinor = 0;
  const paying = new Set<string>();
  for (const row of subRows) {
    if (!subscriptionEntitled(row, now)) continue;
    const plan = (planFromPriceId(row.price_id) || normalizePlan(row.plan)) as PaidPlanType;
    if (!PLAN_PRICES[plan as PaidPlanType]?.recurring) continue;
    mrrMinor += catalogPrice(plan as PaidPlanType).amountMinor;
    paying.add(row.user_email);
  }
  let oneTimeRevenueMinor = 0;
  for (const row of orderRows) {
    if (row.status !== "paid") continue;
    const plan = planFromPriceId(row.price_id) || normalizePlan(row.plan);
    if (plan === "free" || plan === "business") continue;
    oneTimeRevenueMinor += Number(row.amount_minor || catalogPrice(plan as PaidPlanType).amountMinor);
    paying.add(row.user_email);
  }
  return { payingCustomers: paying.size, mrrMinor, oneTimeRevenueMinor };
}

export async function createPendingOrder(db: any, email: string, plan: PaidPlanType) {
  const price = catalogPrice(plan);
  const id = crypto.randomUUID();
  await db.batch([
    db.prepare("UPDATE orders SET status = 'failed' WHERE user_email = ? AND status = 'pending' AND price_id = ?")
      .bind(email, price.priceId),
    db.prepare(
      `INSERT INTO orders (id, user_email, provider, plan, price_id, amount_minor, currency, status)
       VALUES (?, ?, 'hosted', ?, ?, ?, ?, 'pending')`,
    ).bind(id, email, plan, price.priceId, price.amountMinor, price.currency),
  ]);
  return { id, plan, priceId: price.priceId, amountMinor: price.amountMinor, currency: price.currency };
}

export async function applyBillingEvent(db: any, raw: BillingEventInput): Promise<ApplyBillingResult> {
  const user = await db.prepare("SELECT email, plan, plan_tier FROM users WHERE email = ?").bind(raw.email).first();
  if (!user) throw new RequestError(404, "Customer not found");

  const paidPlan = paidPlanFromEvent(raw);
  const recurring = paidPlan ? catalogPrice(paidPlan).recurring : Boolean(raw.subscriptionId);
  const type = canonicalType(raw.type || "", raw.status || "", recurring);
  if (!type) throw new RequestError(400, "Invalid payload");
  if ((type === "paid" || type === "subscription_active") && !paidPlan) throw new RequestError(400, "Invalid payload");

  const occurredAt = toIso(raw.occurredAt);
  const sequence = raw.sequence ?? 0;
  const payloadJson = JSON.stringify(raw.payload || raw);

  const existing = await db.prepare("SELECT status FROM billing_events WHERE event_id = ?").bind(raw.eventId).first();
  if (!existing) {
    await db.prepare(
      `INSERT INTO billing_events (event_id, event_type, customer_email, payload_json, provider_event_at, sequence, status)
       VALUES (?, ?, ?, ?, ?, ?, 'received')`,
    ).bind(raw.eventId, type, raw.email, payloadJson, occurredAt, sequence).run();
  } else if (existing.status === "processed" || existing.status === "ignored") {
    return { duplicate: true, plan: planFromUserRow(user) };
  }

  const claimed = await db.prepare(
    `UPDATE billing_events SET status = 'processing', event_type = ?, payload_json = ?, provider_event_at = ?, sequence = ?
     WHERE event_id = ? AND status IN ('received', 'failed', 'processing')`,
  ).bind(type, payloadJson, occurredAt, sequence, raw.eventId).run();
  if (!Number(claimed?.meta?.changes || 0)) {
    return { duplicate: true, plan: planFromUserRow(user) };
  }

  const latest = await db.prepare(
    `SELECT provider_event_at, sequence FROM billing_events
     WHERE customer_email = ? AND status = 'processed' AND event_id <> ?
     ORDER BY provider_event_at DESC, COALESCE(sequence, 0) DESC LIMIT 1`,
  ).bind(raw.email, raw.eventId).first();
  const stale = latest?.provider_event_at
    && (occurredAt < String(latest.provider_event_at)
      || (occurredAt === String(latest.provider_event_at) && sequence < Number(latest.sequence || 0)));

  if (stale) {
    await db.prepare("UPDATE billing_events SET status = 'ignored', processed_at = CURRENT_TIMESTAMP WHERE event_id = ?")
      .bind(raw.eventId).run();
    return { ignored: true, plan: await effectivePlan(db, raw.email) };
  }

  try {
    const [orderResult, subscriptionResult] = await Promise.all([
      db.prepare("SELECT id, user_email, plan, price_id, amount_minor, status FROM orders WHERE user_email = ?").bind(raw.email).all(),
      db.prepare("SELECT id, user_email, plan, price_id, status, current_period_end, cancel_at, updated_at FROM subscriptions WHERE user_email = ?").bind(raw.email).all(),
    ]);
    const orders = ((orderResult?.results || []) as OrderRow[]).map((row) => ({ ...row }));
    const subscriptions = ((subscriptionResult?.results || []) as SubscriptionRow[]).map((row) => ({ ...row }));
    const statements: any[] = [];
    if (raw.customerId) {
      statements.push(
        db.prepare(
          `INSERT INTO billing_customers (user_email, provider, provider_customer_id)
           VALUES (?, 'hosted', ?)
           ON CONFLICT(user_email) DO UPDATE SET
             provider_customer_id = excluded.provider_customer_id,
             deleted_at = NULL`,
        ).bind(raw.email, raw.customerId),
        db.prepare("UPDATE users SET billing_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?")
          .bind(raw.customerId, raw.email),
      );
    }

    if (type === "paid" || type === "refunded" || type === "chargeback") {
      const orderId = await resolveOrderId(db, raw, type, paidPlan);
      applyOrderMutation(db, statements, orders, { ...raw, orderId }, type, paidPlan, occurredAt);
    }
    if (type === "subscription_active" || type === "past_due" || type === "cancel_scheduled" || type === "cancelled" || type === "expired") {
      applySubscriptionMutation(db, statements, subscriptions, raw, type, paidPlan, occurredAt);
    }

    const plan = planFromRecords(orders, subscriptions, Date.now());
    statements.push(
      db.prepare("UPDATE users SET plan = ?, plan_tier = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?")
        .bind(billingPlanValue(plan), plan, raw.email),
      db.prepare("UPDATE billing_events SET status = 'processed', processed_at = CURRENT_TIMESTAMP WHERE event_id = ?")
        .bind(raw.eventId),
    );
    await db.batch(statements);
    return { plan };
  } catch (error) {
    await db.prepare("UPDATE billing_events SET status = 'failed' WHERE event_id = ?").bind(raw.eventId).run();
    throw error;
  }
}

async function resolveOrderId(db: any, event: BillingEventInput, type: CanonicalType, paidPlan: PaidPlanType | null) {
  if (event.orderId) return event.orderId;
  const priceId = event.priceId || (paidPlan ? catalogPrice(paidPlan).priceId : "");
  if (type === "paid" && priceId) {
    const pending = await db.prepare(
      `SELECT id FROM orders WHERE user_email = ? AND status = 'pending' AND price_id = ? ORDER BY created_at DESC LIMIT 1`,
    ).bind(event.email, priceId).first();
    if (typeof pending?.id === "string") return pending.id;
  }
  if (type !== "paid" && priceId) {
    const paid = await db.prepare(
      `SELECT id FROM orders WHERE user_email = ? AND status = 'paid' AND price_id = ? ORDER BY created_at DESC LIMIT 1`,
    ).bind(event.email, priceId).first();
    if (typeof paid?.id === "string") return paid.id;
  }
  return crypto.randomUUID();
}

function applyOrderMutation(
  db: any,
  statements: any[],
  orders: OrderRow[],
  event: BillingEventInput,
  type: CanonicalType,
  paidPlan: PaidPlanType | null,
  occurredAt: string,
) {
  const plan = paidPlan || parseCheckoutPlan(event.plan);
  const price = catalogPrice(plan);
  const status = type === "paid" ? "paid" : type === "chargeback" ? "chargeback" : "refunded";
  const orderId = event.orderId || crypto.randomUUID();
  const amount = event.amountMinor || price.amountMinor;
  const existing = orders.find((row) => row.id === orderId);
  if (existing) {
    existing.status = status;
    existing.plan = plan;
    existing.price_id = event.priceId || price.priceId;
    existing.amount_minor = amount;
  } else {
    orders.push({ id: orderId, user_email: event.email, plan, price_id: event.priceId || price.priceId, amount_minor: amount, status });
  }
  statements.push(
    db.prepare(
      `INSERT INTO orders (id, user_email, provider, provider_order_id, plan, price_id, amount_minor, currency, status, paid_at, provider_event_at)
       VALUES (?, ?, 'hosted', ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         provider_order_id = COALESCE(excluded.provider_order_id, orders.provider_order_id),
         paid_at = excluded.paid_at,
         provider_event_at = excluded.provider_event_at,
         amount_minor = excluded.amount_minor,
         plan = excluded.plan,
         price_id = excluded.price_id`,
    ).bind(
      orderId,
      event.email,
      event.orderId || null,
      plan,
      event.priceId || price.priceId,
      amount,
      event.currency || price.currency,
      status,
      status === "paid" ? occurredAt : null,
      occurredAt,
    ),
  );
}

function applySubscriptionMutation(
  db: any,
  statements: any[],
  subscriptions: SubscriptionRow[],
  event: BillingEventInput,
  type: CanonicalType,
  paidPlan: PaidPlanType | null,
  occurredAt: string,
) {
  const existing = subscriptions.find((row) => row.id === event.subscriptionId)
    || subscriptions.find((row) => row.id === `sub_${event.email}`)
    || subscriptions[0];
  const plan = paidPlan || (existing ? normalizePlan(existing.plan) as PaidPlanType : parseCheckoutPlan(event.plan));
  const price = catalogPrice(plan);
  const status =
    type === "subscription_active" ? "active"
      : type === "past_due" ? "past_due"
        : type === "cancel_scheduled" ? "cancel_scheduled"
          : type === "expired" ? "expired"
            : "cancelled";
  const id = event.subscriptionId || existing?.id || `sub_${event.email}`;
  const periodEnd = asString(event.payload?.currentPeriodEnd || event.payload?.current_period_end, 40) || existing?.current_period_end || null;
  const cancelAt = asString(event.payload?.cancelAt || event.payload?.cancel_at, 40) || existing?.cancel_at || null;
  const next: SubscriptionRow = {
    id,
    user_email: event.email,
    plan,
    price_id: event.priceId || price.priceId,
    status,
    current_period_end: periodEnd,
    cancel_at: cancelAt,
    updated_at: occurredAt,
  };
  const index = subscriptions.findIndex((row) => row.id === id);
  if (index >= 0) subscriptions[index] = next;
  else subscriptions.push(next);
  statements.push(
    db.prepare(
      `INSERT INTO subscriptions (id, user_email, provider_subscription_id, plan, price_id, status, current_period_end, cancel_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         plan = excluded.plan,
         price_id = excluded.price_id,
         current_period_end = COALESCE(excluded.current_period_end, subscriptions.current_period_end),
         cancel_at = COALESCE(excluded.cancel_at, subscriptions.cancel_at),
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(id, event.email, event.subscriptionId || id, plan, event.priceId || price.priceId, status, periodEnd, cancelAt),
  );
}

export function publishBlockedByDowngrade(plan: PlanType, publishedCount: number, bonusPages = 0) {
  return publishedCount >= pageLimit(plan, bonusPages);
}
