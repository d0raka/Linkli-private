import { describe, expect, it } from "vitest";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { POST as publishProject } from "@/app/api/projects/[id]/publish/route";
import { applyBillingEvent, billingMetrics, effectivePlan } from "@/lib/billing";
import { planFromUserRow } from "@/lib/plans";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createProject, createUser, sessionCookieFor } from "../helpers/users";
import { callRoute, jsonRequest } from "../helpers/requests";
import { paidEvent, webhookRequest } from "../helpers/billing";

describe("billing entitlement matrix", () => {
  useTestDatabase();

  it("derives Free / Pro / Max / Business from orders and subscriptions, not from a claimed plan", async () => {
    const user = await createUser({ email: "matrix@linkli.test" });
    const db = await ensureDatabase();
    expect(await effectivePlan(db, user.email)).toBe("free");

    await applyBillingEvent(db, {
      eventId: "evt_matrix_pro",
      type: "paid",
      email: user.email,
      priceId: "linkli-pro",
      occurredAt: "2026-01-01T00:00:00.000Z",
      sequence: 1,
    });
    expect(await effectivePlan(db, user.email)).toBe("pro");

    await applyBillingEvent(db, {
      eventId: "evt_matrix_max",
      type: "paid",
      email: user.email,
      priceId: "linkli-max",
      occurredAt: "2026-01-02T00:00:00.000Z",
      sequence: 2,
    });
    expect(await effectivePlan(db, user.email)).toBe("max");

    await applyBillingEvent(db, {
      eventId: "evt_matrix_biz",
      type: "subscription_active",
      email: user.email,
      priceId: "linkli-business",
      subscriptionId: "sub_biz",
      occurredAt: "2026-01-03T00:00:00.000Z",
      sequence: 3,
    });
    expect(await effectivePlan(db, user.email)).toBe("business");

    await applyBillingEvent(db, {
      eventId: "evt_matrix_cancel",
      type: "cancelled",
      email: user.email,
      priceId: "linkli-business",
      subscriptionId: "sub_biz",
      occurredAt: "2026-01-04T00:00:00.000Z",
      sequence: 4,
    });
    expect(await effectivePlan(db, user.email)).toBe("max");
  });

  it("keeps Business during a 14-day past_due grace and drops it afterwards", async () => {
    const user = await createUser({ email: "grace@linkli.test" });
    const db = await ensureDatabase();
    await applyBillingEvent(db, {
      eventId: "evt_grace_on",
      type: "subscription_active",
      email: user.email,
      priceId: "linkli-business",
      subscriptionId: "sub_grace",
      occurredAt: "2026-08-01T00:00:00.000Z",
      payload: { currentPeriodEnd: "2026-08-20T00:00:00.000Z" },
    });
    await applyBillingEvent(db, {
      eventId: "evt_grace_due",
      type: "past_due",
      email: user.email,
      priceId: "linkli-business",
      subscriptionId: "sub_grace",
      occurredAt: "2026-08-21T00:00:00.000Z",
      payload: { currentPeriodEnd: "2026-08-20T00:00:00.000Z" },
    });
    expect(await effectivePlan(db, user.email, Date.parse("2026-08-30T00:00:00.000Z"))).toBe("business");
    expect(await effectivePlan(db, user.email, Date.parse("2026-09-10T00:00:00.000Z"))).toBe("free");
  });

  it("refunds to free while keeping published pages and password hashes, and blocks new publishes", async () => {
    const user = await createUser({ email: "refund@linkli.test", plan: "free" });
    const db = await ensureDatabase();
    await applyBillingEvent(db, paidEvent(user.email, {
      eventId: "evt_refund_pay",
      priceId: "linkli-max",
      occurredAt: "2026-09-01T00:00:00.000Z",
    }));
    const live = await createProject(user.email, { published: true, accessPasswordHash: "stored-hash", slug: "kept-live" });
    const draft = await createProject(user.email, { published: false, slug: "blocked-draft" });

    const refund = await callRoute(webhook, await webhookRequest({
      eventId: "evt_refund_back",
      type: "refunded",
      email: user.email,
      priceId: "linkli-max",
      occurredAt: "2026-09-02T00:00:00.000Z",
      sequence: 2,
    }));
    expect(refund.status).toBe(200);
    expect(planFromUserRow(await db.prepare("SELECT plan, plan_tier FROM users WHERE email = ?").bind(user.email).first())).toBe("free");
    const kept = await db.prepare("SELECT published, access_password_hash FROM projects WHERE id = ?").bind(live.id).first();
    expect(kept?.published).toBe(1);
    expect(kept?.access_password_hash).toBe("stored-hash");

    const cookies = await sessionCookieFor(user.email);
    const blocked = await callRoute(
      publishProject,
      jsonRequest(`/api/projects/${draft.id}/publish`, { body: { published: true } }),
      { cookies, params: { id: draft.id } },
    );
    expect(blocked.status).toBe(403);
  });

  it("computes MRR from subscriptions only and one-time revenue separately", async () => {
    const subscriber = await createUser({ email: "biz@linkli.test" });
    const buyer = await createUser({ email: "once@linkli.test" });
    const db = await ensureDatabase();
    await applyBillingEvent(db, {
      eventId: "evt_mrr_sub",
      type: "subscription_active",
      email: subscriber.email,
      priceId: "linkli-business",
      subscriptionId: "sub_mrr",
    });
    await applyBillingEvent(db, paidEvent(buyer.email, { eventId: "evt_mrr_once", priceId: "linkli-pro" }));
    const metrics = await billingMetrics(db);
    expect(metrics.mrrMinor).toBe(9999);
    expect(metrics.oneTimeRevenueMinor).toBe(1990);
    expect(metrics.payingCustomers).toBe(2);
  });
});
