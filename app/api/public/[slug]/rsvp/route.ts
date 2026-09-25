import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { serializeRsvpCookie, submitPublicRsvp } from "@/lib/rsvp";
import { enforceRateLimit, errorResponse, readJsonObject, RequestError, requireSameOrigin, validSlug } from "@/lib/security";

type Context = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const { slug } = await context.params;
    if (!validSlug(slug)) throw new RequestError(404, "העמוד לא נמצא");
    const body = await readJsonObject(request, 65_536);
    if (typeof body.company === "string" && body.company) return NextResponse.json({ ok: true }, { status: 201 });
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "public-rsvp", 8, 900, slug);
    const result = await submitPublicRsvp(db, request, slug, body);
    const response = NextResponse.json({ id: result.id, status: result.status, ok: true }, { status: result.created ? 201 : 200 });
    if (result.token) response.headers.set("Set-Cookie", serializeRsvpCookie(slug, result.token));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
