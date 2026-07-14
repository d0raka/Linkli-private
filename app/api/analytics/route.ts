import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { slug?: string; event?: string };
  if (!body.slug || !["view", "click"].includes(body.event || "")) return NextResponse.json({ ok: false }, { status: 400 });
  const db = await ensureDatabase();
  const column = body.event === "click" ? "clicks" : "views";
  await db.prepare(`UPDATE projects SET ${column} = ${column} + 1 WHERE slug = ? AND published = 1`).bind(body.slug).run();
  return NextResponse.json({ ok: true });
}
