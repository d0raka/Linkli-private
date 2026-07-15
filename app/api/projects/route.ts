import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { createSlug, projectFromRow } from "@/lib/projects";
import { getTemplate, safeConfig } from "@/lib/templates";
import { PROJECT_LIMITS } from "@/lib/plans";
import { enforceRateLimit, errorResponse, readJsonObject, requireSameOrigin, validUuid } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל לפני הכניסה לאזור האישי." }, { status: 403 });
  const db = await ensureDatabase();
  const results = await db.prepare("SELECT * FROM projects WHERE owner_email = ? ORDER BY updated_at DESC").bind(user.email).all();
  return NextResponse.json({ profile: { email: user.email, displayName: user.displayName, plan: user.plan, emailVerified: user.emailVerified }, projects: results.results.map(projectFromRow) });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל לפני יצירת עמוד." }, { status: 403 });
    const body = await readJsonObject(request, 2_048);
    const requestedTemplate = typeof body.templateId === "string" ? body.templateId : "date";
    const template = getTemplate(requestedTemplate);
    if (template.id !== requestedTemplate) return NextResponse.json({ error: "התבנית לא נמצאה" }, { status: 400 });
    if (!template.free && user.plan !== "plus") {
      return NextResponse.json({ error: "התבנית זמינה למנויי Plus" }, { status: 403 });
    }
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "project-create", 20, 600, user.email);
    const projectLimit = PROJECT_LIMITS[user.plan];
    const requestId = request.headers.get("idempotency-key") || crypto.randomUUID();
    if (!validUuid(requestId)) return NextResponse.json({ error: "מזהה הבקשה אינו תקין" }, { status: 400 });
    const existing = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(requestId, user.email).first();
    if (existing) return NextResponse.json({ project: projectFromRow(existing), duplicate: true });

    const id = requestId;
    const title = template.name;
    const slug = createSlug(template.name);
    const config = safeConfig(template.config, template.id);
    const inserted = await db.prepare(
      `INSERT OR IGNORE INTO projects (id, owner_email, title, slug, template_id, config_json)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM projects WHERE owner_email = ?) < ?`
    ).bind(id, user.email, title, slug, template.id, JSON.stringify(config), user.email, projectLimit).run();
    const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
    if (!row || !inserted.meta?.changes) {
      const duplicate = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
      if (duplicate) return NextResponse.json({ project: projectFromRow(duplicate), duplicate: true });
      const count = await db.prepare("SELECT COUNT(*) AS total FROM projects WHERE owner_email = ?").bind(user.email).first();
      if (Number(count?.total || 0) >= projectLimit) {
        return NextResponse.json({ error: user.plan === "plus" ? `מסלול Plus כולל עד ${PROJECT_LIMITS.plus} עמודים.` : "המסלול החינמי כולל עמוד אחד. אפשר למחוק אותו וליצור עמוד אחר, או לשדרג ל־Plus." }, { status: 403 });
      }
      return NextResponse.json({ error: "לא הצלחנו ליצור את העמוד. נסו שוב." }, { status: 409 });
    }
    return NextResponse.json({ project: projectFromRow(row) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
