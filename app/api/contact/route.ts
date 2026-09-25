import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { sendSupportEmail } from "@/lib/email";
import { enforceRateLimit, errorResponse, normalizeEmail, readJsonObject, requireSameOrigin } from "@/lib/security";
import { plainText } from "@/lib/text";

const allowedTopics = new Set(["general", "billing", "accessibility", "privacy", "technical"]);

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 8_192);
    if (typeof body.company === "string" && body.company) return NextResponse.json({ ok: true });
    const name = plainText(body.name, 80, true);
    const email = normalizeEmail(body.email);
    const topic = typeof body.topic === "string" && allowedTopics.has(body.topic) ? body.topic : "general";
    const message = plainText(body.message, 3000);
    let pageUrl = "";
    if (typeof body.pageUrl === "string" && body.pageUrl.trim()) {
      try {
        const parsed = new URL(body.pageUrl.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid protocol");
        pageUrl = parsed.toString().slice(0, 500);
      } catch {
        return NextResponse.json({ error: "כתובת העמוד אינה תקינה" }, { status: 400 });
      }
    }
    if (!name || !email || message.length < 10) return NextResponse.json({ error: "יש למלא שם, דוא״ל תקין והודעה של לפחות 10 תווים" }, { status: 400 });
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "contact", 5, 3_600);
    await db.prepare("INSERT INTO support_requests (id, name, email, topic, message, page_url) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), name, email, topic, message, pageUrl || null).run();
    await sendSupportEmail({ name, email, topic, body: message, pageUrl });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
