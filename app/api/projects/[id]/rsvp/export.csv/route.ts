import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { exportProjectRsvpsCsv } from "@/lib/rsvp";
import { enforceRateLimit, errorResponse, RequestError, validUuid } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await getProductUser();
    if (!user) return new Response(JSON.stringify({ error: "נדרשת התחברות" }), { status: 401, headers: { "content-type": "application/json" } });
    if (!user.emailVerified) return new Response(JSON.stringify({ error: "יש לאמת את כתובת הדוא״ל." }), { status: 403, headers: { "content-type": "application/json" } });
    const { id } = await context.params;
    if (!validUuid(id)) throw new RequestError(404, "העמוד לא נמצא");
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "project-rsvp-export", 10, 600, user.email);
    const csv = await exportProjectRsvpsCsv(db, id, user.email);
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="linkli-rsvp-${id.slice(0, 8)}.csv"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
