import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";

const allowedTopics = new Set(["general", "billing", "accessibility", "privacy", "technical"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.company === "string" && body.company) return NextResponse.json({ ok: true });
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 160) : "";
  const topic = typeof body.topic === "string" && allowedTopics.has(body.topic) ? body.topic : "general";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 3000) : "";
  const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.trim().slice(0, 500) : "";
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10) return NextResponse.json({ error: "יש למלא שם, דוא״ל תקין והודעה של לפחות 10 תווים" }, { status: 400 });
  const db = await ensureDatabase();
  await db.prepare("INSERT INTO support_requests (id, name, email, topic, message, page_url) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), name, email, topic, message, pageUrl || null).run();
  return NextResponse.json({ ok: true }, { status: 201 });
}
