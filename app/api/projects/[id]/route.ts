import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { projectFromRow } from "@/lib/projects";
import { safeConfig } from "@/lib/templates";
import { enforceRateLimit, errorResponse, readJsonObject, requireSameOrigin, validUuid } from "@/lib/security";

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
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 80) : current.title;
    const config = safeConfig(body.config, String(current.template_id));
    await db.prepare("UPDATE projects SET title = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_email = ?")
      .bind(title, JSON.stringify(config), id, user.email).run();
    const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
    return NextResponse.json({ project: projectFromRow(row) });
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
    const result = await db.prepare("DELETE FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).run();
    if (!result.meta?.changes) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
