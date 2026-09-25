import { describe, expect, it } from "vitest";
import { POST as upgrade } from "@/app/api/billing/upgrade/route";
import { GET as billingStatus } from "@/app/api/billing/status/route";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { planFromUserRow } from "@/lib/plans";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createUser, sessionCookieFor } from "../helpers/users";
import { callRoute, getRequest, jsonRequest, readJson } from "../helpers/requests";
import { webhookRequest } from "../helpers/billing";

describe("BILLING_DEMO_MODE checkout", () => {
  useTestDatabase({ BILLING_DEMO_MODE: "1" });

  it("pays through applyBillingEvent instead of writing the plan from the upgrade route", async () => {
    const user = await createUser({ email: "demo@linkli.test" });
    const cookies = await sessionCookieFor(user.email);
    const response = await callRoute(upgrade, jsonRequest("/api/billing/upgrade", { body: { method: "card", plan: "pro" } }), { cookies });
    expect(response.status).toBe(200);
    const data = await readJson<{ url: string }>(response);
    expect(data.url).toContain("/payment/success");
    const status = await callRoute(billingStatus, getRequest("/api/billing/status"), { cookies });
    expect(await readJson(status)).toMatchObject({ plan: "pro", entitled: true });
  });

  it("sandbox: a refund webhook after demo checkout returns the account to free", async () => {
    const user = await createUser({ email: "sandbox@linkli.test" });
    const cookies = await sessionCookieFor(user.email);
    const paid = await callRoute(upgrade, jsonRequest("/api/billing/upgrade", { body: { method: "card", plan: "max" } }), { cookies });
    expect(paid.status).toBe(200);
    const refund = await callRoute(webhook, await webhookRequest({
      eventId: "evt_sandbox_refund",
      type: "refunded",
      email: user.email,
      priceId: "linkli-max",
      occurredAt: new Date().toISOString(),
      sequence: 2,
    }));
    expect(refund.status).toBe(200);
    const db = await ensureDatabase();
    expect(planFromUserRow(await db.prepare("SELECT plan, plan_tier FROM users WHERE email = ?").bind(user.email).first())).toBe("free");
    const status = await callRoute(billingStatus, getRequest("/api/billing/status"), { cookies });
    expect(await readJson(status)).toMatchObject({ plan: "free", entitled: false });
  });
});
