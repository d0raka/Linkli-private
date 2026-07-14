import { NextResponse } from "next/server";
import { ensureUserRecord, getProductUser } from "@/app/chatgpt-auth";
import { ensureDatabase } from "@/db";
import { createSlug, projectFromRow } from "@/lib/projects";
import { getTemplate, safeConfig } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  const profile = await ensureUserRecord(user) as any;
  const db = await ensureDatabase();
  const results = await db.prepare("SELECT * FROM projects WHERE owner_email = ? ORDER BY updated_at DESC").bind(user.email).all();
  return NextResponse.json({ profile: { email: profile.email, displayName: profile.display_name, plan: profile.plan }, projects: results.results.map(projectFromRow) });
}

export async function POST(request: Request) {
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  const profile = await ensureUserRecord(user) as any;
  const body = await request.json().catch(() => ({})) as { templateId?: string };
  const template = getTemplate(body.templateId || "date");
  if (!template.free && profile.plan !== "plus") {
    return NextResponse.json({ error: "התבנית זמינה למנויי Plus" }, { status: 403 });
  }
  const db = await ensureDatabase();
  const id = crypto.randomUUID();
  const title = template.name;
  const slug = createSlug(template.name);
  const config = safeConfig(template.config, template.id);
  await db.prepare(
    "INSERT INTO projects (id, owner_email, title, slug, template_id, config_json) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, user.email, title, slug, template.id, JSON.stringify(config)).run();
  const row = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  return NextResponse.json({ project: projectFromRow(row) }, { status: 201 });
}
