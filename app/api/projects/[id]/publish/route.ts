import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { projectFromRow } from "@/lib/projects";
import { enforceRateLimit, errorResponse, readJsonObject, requireSameOrigin, validUuid } from "@/lib/security";
import { pageLimit } from "@/lib/plans";
import { recordMarketingEventSafely } from "@/lib/marketing";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל לפני פרסום עמוד." }, { status: 403 });
    const { id } = await context.params;
    if (!validUuid(id)) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
    const body = await readJsonObject(request, 2_048);
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "project-publish", 30, 600, user.email);
    const current = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
    if (!current) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
    const shouldPublish = body.published !== false;
    if (shouldPublish && !current.published) {
      const limit = pageLimit(user.plan, user.bonusPages);
      // The quota check and the flip happen in one statement so concurrent publishes cannot both slip under the limit.
      const flipped = await db.prepare(
        `UPDATE projects SET published = 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND owner_email = ? AND published = 0
           AND (SELECT COUNT(*) FROM projects WHERE owner_email = ? AND published = 1) < ?`,
      ).bind(id, user.email, user.email, limit).run();
      if (!Number(flipped.meta?.changes || 0)) {
        return NextResponse.json({ error: user.plan === "free" ? "המסלול החינמי כולל עמוד מפורסם אחד. אפשר להשאיר טיוטות, או לשדרג כדי לפרסם עוד." : `המסלול שלך מאפשר לפרסם עד ${limit} עמודים.`, code: "plan_limit", feature: "morePages" }, { status: 403 });
      }
    } else if (!shouldPublish) {
      await db.prepare("UPDATE projects SET published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_email = ?").bind(id, user.email).run();
    }
    if (shouldPublish && !current.published) {
      await recordMarketingEventSafely(db, "project_published", { userEmail: user.email, templateId: String(current.template_id || "") });
    }
    const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
    return NextResponse.json({ project: projectFromRow(row) });
  } catch (error) {
    return errorResponse(error);
  }
}
