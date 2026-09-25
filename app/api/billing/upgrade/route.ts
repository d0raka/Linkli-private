import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase, runtimeValue } from "@/db";
import {
  applyBillingEvent,
  billingDemoMode,
  createPendingOrder,
  signBillingState,
} from "@/lib/billing";
import { catalogPrice, parsePurchasablePlan } from "@/lib/plans";
import { recordMarketingEventSafely } from "@/lib/marketing";
import { rewardReferralIfNeeded } from "@/lib/referrals";
import { enforceRateLimit, errorResponse, readJsonObject, RequestError, requireSameOrigin, safeHostedCheckoutUrl } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל לפני שדרוג החשבון." }, { status: 403 });
    const body = await readJsonObject(request, 2_048);
    const method = ["card", "paypal", "bit"].includes(String(body.method || "")) ? String(body.method) : "card";
    if (String(body.plan || "") === "business") {
      throw new RequestError(400, "Business בהרשמה מוקדמת. אפשר להשאיר פרטים ונחזור אליכם.", "waitlist");
    }
    const plan = parsePurchasablePlan(body.plan) || "pro";
    const price = catalogPrice(plan);
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "billing-upgrade", 10, 600, user.email);
    await recordMarketingEventSafely(db, "checkout_started", { userEmail: user.email });

    const key = method === "paypal" ? "BILLING_PAYPAL_URL" : method === "bit" ? "BILLING_BIT_URL" : "BILLING_CREDIT_CARD_URL";
    const checkoutUrl = runtimeValue(key) || runtimeValue("BILLING_CHECKOUT_URL");
    if (!checkoutUrl && !billingDemoMode()) {
      throw new RequestError(503, "התשלום ייפתח בקרוב", "billing_unavailable");
    }

    const order = await createPendingOrder(db, user.email, plan);
    const state = await signBillingState({
      orderId: order.id,
      email: user.email,
      plan,
      priceId: price.priceId,
      exp: Math.floor(Date.now() / 1000) + 3_600,
    });

    if (checkoutUrl) {
      const url = safeHostedCheckoutUrl(checkoutUrl, request);
      url.searchParams.set("order_id", order.id);
      url.searchParams.set("custom_id", order.id);
      url.searchParams.set("invoice_id", order.id);
      url.searchParams.set("plan", price.priceId);
      url.searchParams.set("state", state);
      url.searchParams.set("success_url", new URL("/payment/success", request.url).toString());
      url.searchParams.set("cancel_url", new URL("/payment/cancel", request.url).toString());
      return NextResponse.json({ url: url.toString(), orderId: order.id });
    }

    const paid = await applyBillingEvent(db, {
      eventId: `demo_${order.id}`,
      type: price.recurring ? "subscription_active" : "paid",
      occurredAt: new Date().toISOString(),
      email: user.email,
      orderId: order.id,
      subscriptionId: price.recurring ? `demo_sub_${order.id}` : undefined,
      priceId: price.priceId,
      plan,
      amountMinor: price.amountMinor,
      currency: price.currency,
    });
    await rewardReferralIfNeeded(db, user.email, paid.plan);
    return NextResponse.json({ url: `/payment/success?order=${order.id}`, orderId: order.id });
  } catch (error) {
    return errorResponse(error);
  }
}
