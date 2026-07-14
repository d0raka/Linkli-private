import { NextResponse } from "next/server";
import { getProductUser } from "@/app/chatgpt-auth";
import { ensureDatabase, runtimeValue } from "@/db";

export async function POST() {
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  const checkoutUrl = runtimeValue("BILLING_CHECKOUT_URL");
  if (checkoutUrl) {
    const url = new URL(checkoutUrl);
    url.searchParams.set("email", user.email);
    url.searchParams.set("plan", "linkli-plus");
    return NextResponse.json({ url: url.toString() });
  }
  if (process.env.NODE_ENV === "development") {
    const db = await ensureDatabase();
    await db.prepare("UPDATE users SET plan = 'plus', updated_at = CURRENT_TIMESTAMP WHERE email = ?").bind(user.email).run();
    return NextResponse.json({ demo: true });
  }
  return NextResponse.json({ error: "הסליקה עדיין לא חוברה. יש להגדיר קישור Checkout של ספק התשלום." }, { status: 503 });
}
