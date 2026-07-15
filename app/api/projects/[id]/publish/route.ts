import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { projectFromRow } from "@/lib/projects";
import { enforceRateLimit, errorResponse, readJsonObject, requireSameOrigin, validUuid } from "@/lib/security";
import { PROJECT_LIMITS } from "@/lib/plans";

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
      const count = await db.prepare("SELECT COUNT(*) AS total FROM projects WHERE owner_email = ? AND published = 1").bind(user.email).first();
      const limit = PROJECT_LIMITS[user.plan];
      if (Number(count?.total || 0) >= limit) return NextResponse.json({ error: `המסלול שלכם מאפשר לפרסם עד ${limit} עמודים.` }, { status: 403 });
    }
    await db.prepare("UPDATE projects SET published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_email = ?")
      .bind(shouldPublish ? 1 : 0, id, user.email).run();
    const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
    return NextResponse.json({ project: projectFromRow(row) });
  } catch (error) {
    return errorResponse(error);
  }
}
