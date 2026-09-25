import { describe, expect, it } from "vitest";
import { POST as paypalWebhook } from "@/app/api/billing/webhook/paypal/route";
import { applyBillingEvent, createPendingOrder } from "@/lib/billing";
import { planFromUserRow } from "@/lib/plans";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createUser } from "../helpers/users";
import { callRoute, jsonRequest, readJson } from "../helpers/requests";

function paypalHeaders(sig = "good-signature") {
  return {
    "paypal-transmission-id": "trans-linkli-001",
    "paypal-transmission-time": "2026-09-05T10:00:00Z",
    "paypal-transmission-sig": sig,
    "paypal-cert-url": "https://api.paypal.com/v1/notifications/certs/cert.pem",
    "paypal-auth-algo": "SHA256withRSA",
  };
}

function captureEvent(orderId: string, eventId = "8XY12345AB678901A") {
  return {
    id: eventId,
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    create_time: "2026-09-05T10:00:00Z",
    resource: {
      id: eventId,
      custom_id: orderId,
      invoice_id: orderId,
      amount: { value: "19.90", currency_code: "ILS" },
    },
  };
}

describe("PayPal REST webhook", () => {
  useTestDatabase({
    PAYPAL_WEBHOOK_ID: "WH-TEST-1",
    PAYPAL_CLIENT_ID: "paypal-client-test",
    PAYPAL_CLIENT_SECRET: "paypal-secret-test",
    PAYPAL_ENVIRONMENT: "sandbox",
  });

  it("grants the pending plan after a verified capture", async () => {
    const user = await createUser({ email: "paypal@linkli.test" });
    const db = await ensureDatabase();
    const order = await createPendingOrder(db, user.email, "pro");
    const response = await callRoute(
      paypalWebhook,
      jsonRequest("/api/billing/webhook/paypal", { body: captureEvent(order.id), headers: paypalHeaders() }),
    );
    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({ ok: true });
    expect(planFromUserRow(await db.prepare("SELECT plan, plan_tier FROM users WHERE email = ?").bind(user.email).first())).toBe("pro");
    expect(await db.prepare("SELECT status FROM orders WHERE id = ?").bind(order.id).first("status")).toBe("paid");
  });

  it("is idempotent on a duplicate PayPal event", async () => {
    const user = await createUser({ email: "paypal-dup@linkli.test" });
    const db = await ensureDatabase();
    const order = await createPendingOrder(db, user.email, "max");
    const body = captureEvent(order.id, "8XY12345AB678902B");
    const first = await callRoute(paypalWebhook, jsonRequest("/api/billing/webhook/paypal", { body, headers: paypalHeaders() }));
    expect(first.status).toBe(200);
    const replay = await callRoute(paypalWebhook, jsonRequest("/api/billing/webhook/paypal", { body, headers: paypalHeaders() }));
    expect(replay.status).toBe(200);
    expect((await readJson(replay)).duplicate).toBe(true);
    expect(planFromUserRow(await db.prepare("SELECT plan, plan_tier FROM users WHERE email = ?").bind(user.email).first())).toBe("max");
    expect(await db.prepare("SELECT COUNT(*) AS total FROM billing_events WHERE event_id = ?").bind(body.id).first("total")).toBe(1);
  });

  it("rejects a bad PayPal signature without granting a plan", async () => {
    const user = await createUser({ email: "paypal-bad@linkli.test" });
    const db = await ensureDatabase();
    const order = await createPendingOrder(db, user.email, "pro");
    const response = await callRoute(
      paypalWebhook,
      jsonRequest("/api/billing/webhook/paypal", { body: captureEvent(order.id, "8XY12345AB678903C"), headers: paypalHeaders("bad-signature") }),
    );
    expect(response.status).toBe(401);
    expect(planFromUserRow(await db.prepare("SELECT plan, plan_tier FROM users WHERE email = ?").bind(user.email).first())).toBe("free");
  });
});

describe("PayPal mapper stays on applyBillingEvent", () => {
  useTestDatabase();

  it("can apply a paid event already bound to an order", async () => {
    const user = await createUser({ email: "mapped@linkli.test" });
    const db = await ensureDatabase();
    const order = await createPendingOrder(db, user.email, "pro");
    const result = await applyBillingEvent(db, {
      eventId: "paypal_manual_01",
      type: "paid",
      email: user.email,
      orderId: order.id,
      priceId: "linkli-pro",
      plan: "pro",
      amountMinor: 1990,
    });
    expect(result.plan).toBe("pro");
  });
});
