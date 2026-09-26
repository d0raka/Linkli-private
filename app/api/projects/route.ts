import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { createSlug, projectFromRow } from "@/lib/projects";
import { getTemplate, normalizeTemplateId, safeConfig } from "@/lib/templates";
import { applyPlanToConfig, isPaidPlan, pageLimit } from "@/lib/plans";
import { enforceRateLimit, errorResponse, readJsonObject, requireSameOrigin, validUuid } from "@/lib/security";
import { recordMarketingEventSafely } from "@/lib/marketing";

export const dynamic = "force-dynamic";

const MAX_PAGES_PER_ACCOUNT = 100;

export async function GET() {
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל לפני הכניסה לאזור האישי." }, { status: 403 });
  const db = await ensureDatabase();
  const results = await db.prepare("SELECT * FROM projects WHERE owner_email = ? ORDER BY updated_at DESC").bind(user.email).all();
  return NextResponse.json({
    profile: { email: user.email, displayName: user.displayName, plan: user.plan, bonusPages: user.bonusPages, pageLimit: pageLimit(user.plan, user.bonusPages), emailVerified: user.emailVerified },
    projects: results.results.map((row: unknown) => {
      const project = projectFromRow(row);
      return { ...project, config: applyPlanToConfig(project.config, user.plan) };
    }),
  });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    if (!user.emailVerified) return NextResponse.json({ error: "יש לאמת את כתובת הדוא״ל לפני יצירת עמוד." }, { status: 403 });
    const body = await readJsonObject(request, 2_048);
    const requestedTemplate = normalizeTemplateId(typeof body.templateId === "string" ? body.templateId : "date");
    const template = getTemplate(requestedTemplate);
    if (template.id !== requestedTemplate) return NextResponse.json({ error: "התבנית לא נמצאה" }, { status: 400 });
    if (!template.free && !isPaidPlan(user.plan)) {
      return NextResponse.json({ error: "התבנית זמינה במסלול Pro ומעלה", code: "plan_limit", feature: "paidTemplate" }, { status: 403 });
    }
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "project-create", 20, 600, user.email);
    // Plans limit published pages (enforced on publish). Drafts are free on every plan, up to an abuse cap.
    const draftCap = Math.max(MAX_PAGES_PER_ACCOUNT, pageLimit(user.plan, user.bonusPages));
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
    ).bind(id, user.email, title, slug, template.id, JSON.stringify(config), user.email, draftCap).run();
    const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
    if (!row || !inserted.meta?.changes) {
      const duplicate = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
      if (duplicate) return NextResponse.json({ project: projectFromRow(duplicate), duplicate: true });
      const count = await db.prepare("SELECT COUNT(*) AS total FROM projects WHERE owner_email = ?").bind(user.email).first();
      if (Number(count?.total || 0) >= draftCap) {
        return NextResponse.json({ error: `אפשר לשמור עד ${draftCap} עמודים בחשבון. מחקו טיוטות ישנות כדי ליצור חדשות.`, code: "draft_cap" }, { status: 403 });
      }
      return NextResponse.json({ error: "לא הצלחנו ליצור את העמוד. נסו שוב." }, { status: 409 });
    }
    await recordMarketingEventSafely(db, "project_created", { userEmail: user.email, templateId: template.id });
    const created = projectFromRow(row);
    return NextResponse.json({ project: { ...created, config: applyPlanToConfig(created.config, user.plan) } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
