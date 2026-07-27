import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { isApiResponse, requireAdminApiUser, writeAdminAudit } from "@/lib/admin";
import { enforceRateLimit, errorResponse, normalizeEmail, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";

type Context = { params: Promise<{ email: string }> };
const statuses = new Set(["new", "contacted", "converted", "closed"]);

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const admin = await requireAdminApiUser();
    if (isApiResponse(admin)) return admin;
    const email = normalizeEmail(decodeURIComponent((await context.params).email));
    const body = await readJsonObject(request, 1_024);
    const status = typeof body.status === "string" && statuses.has(body.status) ? body.status : null;
    if (!email || !status) throw new RequestError(400, "פרטי הליד אינם תקינים");
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "admin-marketing-lead", 60, 60, admin.email);
    const result = await db.prepare("UPDATE marketing_leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?").bind(status, email).run();
    if (!result.meta?.changes) throw new RequestError(404, "הליד לא נמצא");
    await writeAdminAudit(admin.email, "marketing.lead_status_changed", "marketing_lead", email, { status });
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return errorResponse(error);
  }
}
