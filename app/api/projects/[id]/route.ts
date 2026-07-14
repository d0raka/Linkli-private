import { NextResponse } from "next/server";
import { getProductUser } from "@/app/chatgpt-auth";
import { ensureDatabase } from "@/db";
import { projectFromRow } from "@/lib/projects";
import { safeConfig } from "@/lib/templates";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  const { id } = await context.params;
  const db = await ensureDatabase();
  const current = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
  if (!current) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { title?: string; config?: unknown };
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 80) : current.title;
  const config = safeConfig(body.config, current.template_id);
  await db.prepare("UPDATE projects SET title = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_email = ?")
    .bind(title, JSON.stringify(config), id, user.email).run();
  const row = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  return NextResponse.json({ project: projectFromRow(row) });
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  const { id } = await context.params;
  const db = await ensureDatabase();
  await db.prepare("DELETE FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).run();
  return NextResponse.json({ ok: true });
}
