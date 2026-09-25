import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { isApiResponse, requireAdminApiUser, requireAdminReauth, writeAdminAudit } from "@/lib/admin";
import { pageLimit, planFromUserRow } from "@/lib/plans";
import { enforceRateLimit, errorResponse, readJsonObject, RequestError, requireSameOrigin, validUuid } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const admin = await requireAdminApiUser();
    if (isApiResponse(admin)) return admin;
    const { id } = await context.params;
    if (!validUuid(id)) throw new RequestError(404, "העמוד לא נמצא");
    const body = await readJsonObject(request, 1_024);
    if (typeof body.published !== "boolean") throw new RequestError(400, "סטטוס פרסום לא תקין");
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "admin-project", 60, 60, admin.email);
    const project = await db.prepare("SELECT id, published, owner_email FROM projects WHERE id = ?").bind(id).first();
    if (!project) throw new RequestError(404, "העמוד לא נמצא");
    await requireAdminReauth(db, request, admin, body);
    if (body.published && !Number(project.published)) {
      const owner = await db.prepare("SELECT plan, plan_tier, bonus_pages FROM users WHERE email = ?").bind(project.owner_email).first();
      if (!owner) throw new RequestError(404, "העמוד לא נמצא");
      const plan = planFromUserRow(owner);
      const limit = pageLimit(plan, Number(owner.bonus_pages || 0));
      const flipped = await db.prepare(
        `UPDATE projects SET published = 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND published = 0
           AND (SELECT COUNT(*) FROM projects WHERE owner_email = ? AND published = 1) < ?`,
      ).bind(id, project.owner_email, limit).run();
      if (!Number(flipped.meta?.changes || 0)) {
        throw new RequestError(
          403,
          plan === "free"
            ? "המסלול החינמי כולל עמוד מפורסם אחד. אפשר להשאיר טיוטות, או לשדרג כדי לפרסם עוד."
            : `המסלול של בעל העמוד מאפשר לפרסם עד ${limit} עמודים.`,
          "plan_limit",
        );
      }
    } else {
      await db.prepare("UPDATE projects SET published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(body.published ? 1 : 0, id).run();
    }
    await writeAdminAudit(admin.email, body.published ? "project.published" : "project.unpublished", "project", id, { ownerEmail: project.owner_email });
    return NextResponse.json({ ok: true, published: body.published });
  } catch (error) {
    return errorResponse(error);
  }
}
