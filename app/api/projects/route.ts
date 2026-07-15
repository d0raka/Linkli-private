import { NextResponse } from "next/server";
import { ensureUserRecord, getProductUser } from "@/app/chatgpt-auth";
import { ensureDatabase } from "@/db";
import { createSlug, projectFromRow } from "@/lib/projects";
import { getTemplate, safeConfig } from "@/lib/templates";
import { enforceRateLimit, errorResponse, readJsonObject, requireSameOrigin } from "@/lib/security";

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
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    const profile = await ensureUserRecord(user) as any;
    const body = await readJsonObject(request, 2_048);
    const requestedTemplate = typeof body.templateId === "string" ? body.templateId : "date";
    const template = getTemplate(requestedTemplate);
    if (template.id !== requestedTemplate) return NextResponse.json({ error: "התבנית לא נמצאה" }, { status: 400 });
    if (!template.free && profile.plan !== "plus") {
      return NextResponse.json({ error: "התבנית זמינה למנויי Plus" }, { status: 403 });
    }
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "project-create", 20, 600, user.email);
    const count = await db.prepare("SELECT COUNT(*) AS total FROM projects WHERE owner_email = ?").bind(user.email).first();
    const projectLimit = profile.plan === "plus" ? 50 : 5;
    if (Number(count?.total || 0) >= projectLimit) {
      return NextResponse.json({ error: `התוכנית שלך מאפשרת עד ${projectLimit} פרויקטים` }, { status: 403 });
    }
    const id = crypto.randomUUID();
    const title = template.name;
    const slug = createSlug(template.name);
    const config = safeConfig(template.config, template.id);
    await db.prepare(
      "INSERT INTO projects (id, owner_email, title, slug, template_id, config_json) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(id, user.email, title, slug, template.id, JSON.stringify(config)).run();
    const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
    return NextResponse.json({ project: projectFromRow(row) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
