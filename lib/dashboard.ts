import { projectFromRow, type ProjectRecord } from "./projects";
import { applyPlanToConfig, type PlanType } from "./plans";
import { getTemplate, type TemplateTheme } from "./templates";

export type RsvpTotals = { responses: number; attending: number; guests: number };

export type DashboardPage = {
  id: string;
  title: string;
  slug: string;
  templateName: string;
  published: boolean;
  passwordProtected: boolean;
  views: number;
  clicks: number;
  updatedAt: string;
  headline: string;
  subtitle: string;
  emoji: string;
  emojiImageVersion: number;
  accent: string;
  accentSoft: string;
  theme: TemplateTheme;
  rsvpEnabled: boolean;
  rsvp: RsvpTotals | null;
};

export type PageStage = "draft" | "live-unseen" | "live";

/** Where a page stands in its life: drafts need publishing, unseen live pages need sharing. */
export function pageStage(page: Pick<DashboardPage, "published" | "views">): PageStage {
  if (!page.published) return "draft";
  return page.views > 0 ? "live" : "live-unseen";
}

export function toDashboardPage(project: ProjectRecord, plan: PlanType, rsvp?: RsvpTotals): DashboardPage {
  const config = applyPlanToConfig(project.config, plan);
  const rsvpEnabled = config.rsvpEnabled === true;
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    templateName: getTemplate(project.templateId).name,
    published: project.published,
    passwordProtected: project.passwordProtected,
    views: project.views,
    clicks: project.clicks,
    updatedAt: project.updatedAt,
    headline: config.headline,
    subtitle: config.subtitle || config.introLabel,
    emoji: config.emoji,
    emojiImageVersion: config.emojiImageVersion || 0,
    accent: config.accent,
    accentSoft: config.accentSoft,
    theme: config.theme,
    rsvpEnabled,
    rsvp: rsvpEnabled ? rsvp ?? { responses: 0, attending: 0, guests: 0 } : null,
  };
}

export async function loadDashboardPages(db: any, ownerEmail: string, plan: PlanType): Promise<DashboardPage[]> {
  const [projectRows, rsvpRows] = await db.batch([
    db.prepare("SELECT * FROM projects WHERE owner_email = ? ORDER BY updated_at DESC").bind(ownerEmail),
    db.prepare(
      `SELECT project_id,
         COUNT(*) AS responses,
         SUM(CASE WHEN status = 'yes' THEN 1 ELSE 0 END) AS attending,
         SUM(CASE WHEN status = 'yes' THEN guest_count ELSE 0 END) AS guests
       FROM rsvp_responses
       WHERE project_id IN (SELECT id FROM projects WHERE owner_email = ?)
       GROUP BY project_id`,
    ).bind(ownerEmail),
  ]);
  const totals = new Map<string, RsvpTotals>();
  for (const row of (rsvpRows.results || []) as Array<Record<string, unknown>>) {
    totals.set(String(row.project_id), {
      responses: Number(row.responses || 0),
      attending: Number(row.attending || 0),
      guests: Number(row.guests || 0),
    });
  }
  return ((projectRows.results || []) as unknown[]).map((row) => {
    const project = projectFromRow(row);
    return toDashboardPage(project, plan, totals.get(project.id));
  });
}
