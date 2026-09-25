import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { applyBillingEvent } from "@/lib/billing";
import { mapPaypalWebhookEvent, verifyPaypalWebhookSignature } from "@/lib/paypal-webhook";
import { rewardReferralIfNeeded } from "@/lib/referrals";
import { enforceRateLimit, errorResponse, RequestError } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    const declaredLength = Number(request.headers.get("content-length") || "0");
    if (contentType !== "application/json") throw new RequestError(415, "Unsupported media type");
    if (Number.isFinite(declaredLength) && declaredLength > 32_768) throw new RequestError(413, "Payload too large");
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 32_768) throw new RequestError(413, "Payload too large");

    const event = await verifyPaypalWebhookSignature(rawBody, request.headers);
    const mapped = mapPaypalWebhookEvent(event);
    if (!mapped) return NextResponse.json({ ok: true, ignored: true });

    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "billing-webhook-paypal", 120, 60);
    const order = await db.prepare("SELECT id, user_email, plan, price_id, amount_minor FROM orders WHERE id = ?")
      .bind(mapped.orderId).first();
    if (!order?.user_email) throw new RequestError(404, "Customer not found");

    const result = await applyBillingEvent(db, {
      eventId: mapped.eventId,
      type: mapped.type,
      occurredAt: mapped.occurredAt,
      email: String(order.user_email),
      orderId: String(order.id),
      priceId: typeof order.price_id === "string" ? order.price_id : undefined,
      plan: typeof order.plan === "string" ? order.plan : undefined,
      amountMinor: mapped.amountMinor ?? (typeof order.amount_minor === "number" ? order.amount_minor : undefined),
      currency: mapped.currency,
      payload: event,
    });
    if (result.plan && result.plan !== "free" && !result.duplicate && !result.ignored) {
      await rewardReferralIfNeeded(db, String(order.user_email), result.plan);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
