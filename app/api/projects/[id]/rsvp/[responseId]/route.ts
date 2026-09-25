import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { deleteProjectRsvp } from "@/lib/rsvp";
import { enforceRateLimit, errorResponse, RequestError, requireSameOrigin, validUuid } from "@/lib/security";

type Context = { params: Promise<{ id: string; responseId: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל." }, { status: 403 });
    const { id, responseId } = await context.params;
    if (!validUuid(id) || !validUuid(responseId)) throw new RequestError(404, "המענה לא נמצא");
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "project-rsvp-delete", 30, 600, user.email);
    await deleteProjectRsvp(db, id, user.email, responseId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
