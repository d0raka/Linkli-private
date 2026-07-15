import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { createSlug, projectFromRow } from "@/lib/projects";
import { getTemplate, safeConfig } from "@/lib/templates";
import { enforceRateLimit, errorResponse, readJsonObject, requireSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  const db = await ensureDatabase();
  const results = await db.prepare("SELECT * FROM projects WHERE owner_email = ? ORDER BY updated_at DESC").bind(user.email).all();
  return NextResponse.json({ profile: { email: user.email, displayName: user.displayName, plan: user.plan, emailVerified: user.emailVerified }, projects: results.results.map(projectFromRow) });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    const body = await readJsonObject(request, 2_048);
    const requestedTemplate = typeof body.templateId === "string" ? body.templateId : "date";
    const template = getTemplate(requestedTemplate);
    if (template.id !== requestedTemplate) return NextResponse.json({ error: "התבנית לא נמצאה" }, { status: 400 });
    if (!template.free && user.plan !== "plus") {
      return NextResponse.json({ error: "התבנית זמינה למנויי Plus" }, { status: 403 });
    }
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "project-create", 20, 600, user.email);
    const count = await db.prepare("SELECT COUNT(*) AS total FROM projects WHERE owner_email = ?").bind(user.email).first();
    const projectLimit = user.plan === "plus" ? 10 : 1;
    if (Number(count?.total || 0) >= projectLimit) {
      return NextResponse.json({ error: user.plan === "plus" ? "מסלול Plus מאפשר ליצור עד 10 עמודים פעילים." : "המסלול החינמי כולל עמוד פעיל אחד. אפשר למחוק אותו וליצור עמוד אחר, או לשדרג ל־Plus." }, { status: 403 });
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
