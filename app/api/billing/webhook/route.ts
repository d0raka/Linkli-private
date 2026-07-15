import { NextResponse } from "next/server";
import { ensureDatabase, runtimeValue } from "@/db";
import { enforceRateLimit, errorResponse, normalizeEmail, RequestError, verifyWebhookSignature } from "@/lib/security";

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
    const email = normalizeEmail(body.email);
    const status = body.status === "active" ? "active" : body.status === "cancelled" ? "cancelled" : "";
    const eventId = typeof body.eventId === "string" ? body.eventId.trim().slice(0, 128) : "";
    const customerId = typeof body.customerId === "string" ? body.customerId.trim().slice(0, 160) : "";
    if (!email || !status || !/^[A-Za-z0-9_.:-]{8,128}$/.test(eventId)) throw new RequestError(400, "Invalid payload");

    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "billing-webhook", 120, 60);
    const user = await db.prepare("SELECT email FROM users WHERE email = ?").bind(email).first();
    if (!user) throw new RequestError(404, "Customer not found");

    const plan = status === "active" ? "plus" : "free";
    const inserted = await db.prepare("INSERT OR IGNORE INTO billing_events (event_id, event_type, customer_email) VALUES (?, ?, ?)").bind(eventId, status, email).run();
    if (!inserted.meta?.changes) return NextResponse.json({ ok: true, duplicate: true });
    try {
      await db.prepare("UPDATE users SET plan = ?, billing_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?")
        .bind(plan, customerId || null, email).run();
    } catch (error) {
      await db.prepare("DELETE FROM billing_events WHERE event_id = ?").bind(eventId).run();
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
