import { NextResponse } from "next/server";
import { getProductUser } from "@/app/chatgpt-auth";
import { ensureDatabase, runtimeValue } from "@/db";

export async function POST(request: Request) {
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { method?: string };
  const method = ["card", "paypal", "bit"].includes(body.method || "") ? body.method! : "card";
  const key = method === "paypal" ? "BILLING_PAYPAL_URL" : method === "bit" ? "BILLING_BIT_URL" : "BILLING_CREDIT_CARD_URL";
  const checkoutUrl = runtimeValue(key) || runtimeValue("BILLING_CHECKOUT_URL");
  if (checkoutUrl) {
    const url = new URL(checkoutUrl);
    url.searchParams.set("email", user.email);
    url.searchParams.set("plan", "linkli-plus");
    url.searchParams.set("success_url", new URL("/payment/success", request.url).toString());
    url.searchParams.set("cancel_url", new URL("/payment/cancel", request.url).toString());
    return NextResponse.json({ url: url.toString() });
  }
  if (process.env.NODE_ENV === "development") {
    const db = await ensureDatabase();
    await db.prepare("UPDATE users SET plan = 'plus', updated_at = CURRENT_TIMESTAMP WHERE email = ?").bind(user.email).run();
    return NextResponse.json({ demo: true });
  }
  return NextResponse.json({ error: `אמצעי התשלום עדיין לא הופעל. יש לחבר את ${key} בהגדרות האתר.` }, { status: 503 });
}
