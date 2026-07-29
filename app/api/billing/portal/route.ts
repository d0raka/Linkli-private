import { NextResponse } from "next/server";
import { ensureDatabase, runtimeValue } from "@/db";
import { getProductUser } from "@/lib/auth";
import { errorResponse, RequestError, requireSameOrigin, safeHostedCheckoutUrl } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) throw new RequestError(401, "נדרשת התחברות כדי לנהל את המנוי.");
    if (user.plan !== "plus") throw new RequestError(403, "אין מנוי פעיל לניהול.");

    const configuredUrl = runtimeValue("BILLING_PORTAL_URL");
    if (!configuredUrl) throw new RequestError(503, "ניהול המנוי אינו זמין כרגע. פנו אלינו ונשמח לעזור.");

    const db = await ensureDatabase();
    const billing = await db.prepare("SELECT billing_customer_id FROM users WHERE email = ?")
      .bind(user.email).first();
    const portalUrl = safeHostedCheckoutUrl(configuredUrl, request);
    portalUrl.searchParams.set("email", user.email);
    if (typeof billing?.billing_customer_id === "string" && billing.billing_customer_id.trim()) {
      portalUrl.searchParams.set("customer_id", billing.billing_customer_id.trim());
    }
    portalUrl.searchParams.set("return_url", new URL("/checkout", request.url).toString());

    return NextResponse.redirect(portalUrl.toString(), 303);
  } catch (error) {
    return errorResponse(error);
  }
}
