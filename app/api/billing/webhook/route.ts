import { NextResponse } from "next/server";
import { ensureDatabase, runtimeValue } from "@/db";
import { applyBillingEvent, parseBillingPayload } from "@/lib/billing";
import { rewardReferralIfNeeded } from "@/lib/referrals";
import { enforceRateLimit, errorResponse, RequestError, verifyWebhookSignature } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    const declaredLength = Number(request.headers.get("content-length") || "0");
    if (contentType !== "application/json") throw new RequestError(415, "Unsupported media type");
    if (Number.isFinite(declaredLength) && declaredLength > 16_384) throw new RequestError(413, "Payload too large");
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 16_384) throw new RequestError(413, "Payload too large");

    const secret = runtimeValue("BILLING_WEBHOOK_SECRET");
    if (!secret || !(await verifyWebhookSignature(
      rawBody,
      request.headers.get("x-linkli-timestamp"),
      request.headers.get("x-linkli-signature"),
      secret,
    ))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new RequestError(400, "Invalid payload");
    }

    const event = parseBillingPayload(body);
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "billing-webhook", 120, 60);
    const result = await applyBillingEvent(db, event);
    if (result.plan && result.plan !== "free" && !result.duplicate && !result.ignored) {
      await rewardReferralIfNeeded(db, event.email, result.plan);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
