import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase, runtimeValue } from "@/db";
import { enforceRateLimit, errorResponse, readJsonObject, requireSameOrigin, safeHostedCheckoutUrl } from "@/lib/security";
import { recordMarketingEventSafely } from "@/lib/marketing";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל לפני שדרוג החשבון." }, { status: 403 });
    const body = await readJsonObject(request, 2_048);
    const method = ["card", "paypal", "bit"].includes(String(body.method || "")) ? String(body.method) : "card";
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "billing-upgrade", 10, 600, user.email);
    await recordMarketingEventSafely(db, "checkout_started", { userEmail: user.email });
    const key = method === "paypal" ? "BILLING_PAYPAL_URL" : method === "bit" ? "BILLING_BIT_URL" : "BILLING_CREDIT_CARD_URL";
    const checkoutUrl = runtimeValue(key) || runtimeValue("BILLING_CHECKOUT_URL");
    if (checkoutUrl) {
      const url = safeHostedCheckoutUrl(checkoutUrl, request);
      url.searchParams.set("email", user.email);
      url.searchParams.set("plan", "linkli-plus");
      url.searchParams.set("success_url", new URL("/payment/success", request.url).toString());
      url.searchParams.set("cancel_url", new URL("/payment/cancel", request.url).toString());
      return NextResponse.json({ url: url.toString() });
    }

    // Instant interactive upgrade mode for development and testing
    await db.prepare("UPDATE users SET plan = 'plus', updated_at = CURRENT_TIMESTAMP WHERE email = ?").bind(user.email).run();
    return NextResponse.json({ url: "/payment/success?upgraded=1" });
  } catch (error) {
    return errorResponse(error);
  }
}
