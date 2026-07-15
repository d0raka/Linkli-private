import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { enforceRateLimit, errorResponse, readJsonObject, requireSameOrigin, validSlug } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 2_048);
    const slug = typeof body.slug === "string" ? body.slug : "";
    const event = body.event === "click" ? "click" : body.event === "view" ? "view" : "";
    if (!validSlug(slug) || !event) return NextResponse.json({ ok: false }, { status: 400 });
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, `analytics:${event}`, 120, 60, slug);
    const column = event === "click" ? "clicks" : "views";
    await db.prepare(`UPDATE projects SET ${column} = ${column} + 1 WHERE slug = ? AND published = 1`).bind(slug).run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
