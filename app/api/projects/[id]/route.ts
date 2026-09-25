import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { normalizeSlug, projectFromRow } from "@/lib/projects";
import { applyPlanToConfig, preserveGatedConfig } from "@/lib/plans";
import { safeConfig } from "@/lib/templates";
import { enforceRateLimit, errorResponse, readJsonObject, RequestError, requireSameOrigin, validSlug, validUuid } from "@/lib/security";
import { plainText } from "@/lib/text";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל לפני עריכת עמוד." }, { status: 403 });
    const { id } = await context.params;
    if (!validUuid(id)) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "project-update", 60, 60, user.email);
    const current = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
    if (!current) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
    const body = await readJsonObject(request, 16_384);
    const requestedTitle = plainText(body.title, 80, true);
    const title = requestedTitle || current.title;
    const incoming = safeConfig(body.config, String(current.template_id));
    const config = preserveGatedConfig(incoming, projectFromRow(current).config, user.plan);
    const requestedSlug = typeof body.slug === "string" ? normalizeSlug(body.slug) : "";
    const slug = requestedSlug || String(current.slug);
    if (!validSlug(slug) || slug.length < 3) {
      throw new RequestError(400, "הכתובת צריכה להיות באנגלית, לפחות 3 תווים, עם אותיות, מספרים או מקף.");
    }
    if (slug !== current.slug) {
      const taken = await db.prepare("SELECT id FROM projects WHERE slug = ? AND id != ?").bind(slug, id).first();
      if (taken) throw new RequestError(409, "הכתובת כבר תפוסה. בחרו אחת אחרת.");
    }
    // Optimistic concurrency: a client that sends the updated_at it last saw only wins if nobody
    // else saved in between. Millisecond timestamps keep two saves from sharing a version token.
    const expectedUpdatedAt = typeof body.expectedUpdatedAt === "string" && body.expectedUpdatedAt ? body.expectedUpdatedAt : null;
    const result = await db.prepare(
      `UPDATE projects SET title = ?, slug = ?, config_json = ?, updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
       WHERE id = ? AND owner_email = ? AND (? IS NULL OR updated_at = ?)`,
    ).bind(title, slug, JSON.stringify(config), id, user.email, expectedUpdatedAt, expectedUpdatedAt).run();
    const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
    if (!row) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
    const saved = projectFromRow(row);
    const payload = { project: { ...saved, config: applyPlanToConfig(saved.config, user.plan) } };
    if (!Number(result.meta?.changes || 0)) {
      return NextResponse.json({ error: "העמוד השתנה בינתיים בחלון או במכשיר אחר. טענו את הגרסה העדכנית לפני שממשיכים.", code: "conflict", ...payload }, { status: 409 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל לפני מחיקת עמוד." }, { status: 403 });
    const { id } = await context.params;
    if (!validUuid(id)) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "project-delete", 20, 600, user.email);
    // Media rows are scoped through the owner-checked project so a foreign UUID can never
    // touch another account's uploads; the batch keeps project and media deletion atomic.
    const [, , , result] = await db.batch([
      db.prepare("DELETE FROM project_backgrounds WHERE project_id IN (SELECT id FROM projects WHERE id = ? AND owner_email = ?)").bind(id, user.email),
      db.prepare("DELETE FROM project_emoji_images WHERE project_id IN (SELECT id FROM projects WHERE id = ? AND owner_email = ?)").bind(id, user.email),
      db.prepare("DELETE FROM rsvp_responses WHERE project_id IN (SELECT id FROM projects WHERE id = ? AND owner_email = ?)").bind(id, user.email),
      db.prepare("DELETE FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email),
    ]);
    if (!result.meta?.changes) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
