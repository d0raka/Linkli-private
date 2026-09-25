import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { listProjectRsvps } from "@/lib/rsvp";
import { enforceRateLimit, errorResponse, RequestError, validUuid } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל." }, { status: 403 });
    const { id } = await context.params;
    if (!validUuid(id)) throw new RequestError(404, "העמוד לא נמצא");
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get("offset") || 0);
    const limit = Number(url.searchParams.get("limit") || 50);
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "project-rsvp-list", 60, 60, user.email);
    const payload = await listProjectRsvps(db, id, user.email, Number.isFinite(offset) ? offset : 0, Number.isFinite(limit) ? limit : 50);
    return NextResponse.json(payload);
  } catch (error) {
    return errorResponse(error);
  }
}
