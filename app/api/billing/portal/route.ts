import { NextResponse } from "next/server";
import { ensureDatabase, runtimeValue } from "@/db";
import { getProductUser } from "@/lib/auth";
import { isPaidPlan } from "@/lib/plans";
import { signBillingState } from "@/lib/billing";
import { errorResponse, RequestError, requireSameOrigin, safeHostedCheckoutUrl } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) throw new RequestError(401, "נדרשת התחברות כדי לנהל את המנוי.");
    if (!isPaidPlan(user.plan)) throw new RequestError(403, "אין מנוי פעיל לניהול.");

    const configuredUrl = runtimeValue("BILLING_PORTAL_URL");
    if (!configuredUrl) throw new RequestError(503, "ניהול המנוי אינו זמין כרגע. פנו אלינו ונשמח לעזור.");

    const db = await ensureDatabase();
    const billing = await db.prepare(
      `SELECT users.billing_customer_id AS customer_id, billing_customers.provider_customer_id
       FROM users LEFT JOIN billing_customers ON billing_customers.user_email = users.email
       WHERE users.email = ?`,
    ).bind(user.email).first();
    const customerId = String(billing?.provider_customer_id || billing?.customer_id || "").trim();
    const state = await signBillingState({
      email: user.email,
      customerId,
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    const portalUrl = safeHostedCheckoutUrl(configuredUrl, request);
    portalUrl.searchParams.set("state", state);
    if (customerId) portalUrl.searchParams.set("customer_id", customerId);
    portalUrl.searchParams.set("return_url", new URL("/checkout", request.url).toString());

    return NextResponse.redirect(portalUrl.toString(), 303);
  } catch (error) {
    return errorResponse(error);
  }
}
