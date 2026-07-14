import { NextResponse } from "next/server";
import { ensureDatabase, runtimeValue } from "@/db";

export async function POST(request: Request) {
  const secret = runtimeValue("BILLING_WEBHOOK_SECRET");
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { email?: string; status?: string; customerId?: string };
  if (!body.email || !["active", "cancelled"].includes(body.status || "")) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const db = await ensureDatabase();
  const plan = body.status === "active" ? "plus" : "free";
  await db.prepare("UPDATE users SET plan = ?, billing_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?")
    .bind(plan, body.customerId || null, body.email).run();
  return NextResponse.json({ ok: true });
}
