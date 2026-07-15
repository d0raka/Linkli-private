import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { isApiResponse, requireAdminApiUser, writeAdminAudit } from "@/lib/admin";
import { enforceRateLimit, errorResponse, readJsonObject, RequestError, requireSameOrigin, validUuid } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };
const statuses = new Set(["new", "in_progress", "closed"]);

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const admin = await requireAdminApiUser();
    if (isApiResponse(admin)) return admin;
    const { id } = await context.params;
    if (!validUuid(id)) throw new RequestError(404, "הפנייה לא נמצאה");
    const body = await readJsonObject(request, 1_024);
    const status = typeof body.status === "string" && statuses.has(body.status) ? body.status : null;
    if (!status) throw new RequestError(400, "סטטוס לא תקין");
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "admin-support", 60, 60, admin.email);
    const result = await db.prepare("UPDATE support_requests SET status = ? WHERE id = ?").bind(status, id).run();
    if (!result.meta?.changes) throw new RequestError(404, "הפנייה לא נמצאה");
    await writeAdminAudit(admin.email, "support.status_changed", "support", id, { status });
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return errorResponse(error);
  }
}
