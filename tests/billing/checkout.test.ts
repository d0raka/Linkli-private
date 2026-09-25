import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { POST as upgrade } from "@/app/api/billing/upgrade/route";
import { POST as portal } from "@/app/api/billing/portal/route";
import { GET as billingStatus } from "@/app/api/billing/status/route";
import PaymentSuccessPage from "@/app/payment/success/page";
import { verifyBillingState } from "@/lib/billing";
import { useTestDatabase } from "../setup/db";
import { createUser, sessionCookieFor } from "../helpers/users";
import { callRoute, getRequest, jsonRequest, readJson } from "../helpers/requests";
import { runWithRequestContext } from "../shims/next-headers";

describe("checkout binding and success page", () => {
  const db = useTestDatabase({
    BILLING_CHECKOUT_URL: "https://pay.example.com/checkout",
    BILLING_PORTAL_URL: "https://pay.example.com/portal",
  });

  it("creates a pending order and sends a signed state instead of a bare email", async () => {
    const user = await createUser({ email: "buyer@linkli.test" });
    const cookies = await sessionCookieFor(user.email);
    const response = await callRoute(upgrade, jsonRequest("/api/billing/upgrade", { body: { method: "card", plan: "max" } }), { cookies });
    expect(response.status).toBe(200);
    const data = await readJson<{ url: string; orderId: string }>(response);
    const url = new URL(data.url);
    expect(url.searchParams.has("email")).toBe(false);
    expect(url.searchParams.get("plan")).toBe("linkli-max");
    expect(url.searchParams.get("order_id")).toBe(data.orderId);
    const state = await verifyBillingState<{ email: string; orderId: string; plan: string; priceId: string }>(url.searchParams.get("state"));
    expect(state).toMatchObject({ email: user.email, orderId: data.orderId, plan: "max", priceId: "linkli-max" });
    expect(await db().prepare("SELECT status, plan FROM orders WHERE id = ?").bind(data.orderId).first()).toMatchObject({ status: "pending", plan: "max" });
  });

  it("does not grant a plan from the success URL when no paid order exists", async () => {
    const user = await createUser({ email: "unpaid@linkli.test" });
    const cookies = await sessionCookieFor(user.email);
    const status = await callRoute(billingStatus, getRequest("/api/billing/status"), { cookies });
    expect(status.status).toBe(200);
    expect(await readJson(status)).toMatchObject({ plan: "free", entitled: false, processing: false });

    const page = await runWithRequestContext({ cookies }, () => PaymentSuccessPage()) as ReactElement;
    expect(JSON.stringify(page)).toContain("processing");
    expect(JSON.stringify(page)).not.toContain("מסלול Max פעיל");
  });

  it("keeps the portal URL free of unsigned email query params", async () => {
    const user = await createUser({ email: "paid@linkli.test", plan: "pro" });
    const cookies = await sessionCookieFor(user.email);
    const response = await callRoute(portal, jsonRequest("/api/billing/portal", { method: "POST", body: {} }), { cookies });
    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("location") || "");
    expect(location.searchParams.has("email")).toBe(false);
    expect(location.searchParams.get("state")).toBeTruthy();
  });
});

