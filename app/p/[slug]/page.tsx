import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensureDatabase } from "@/db";
import { projectFromRow } from "@/lib/projects";
import { applyPlanToConfig, isPaidPlan, planFromUserRow } from "@/lib/plans";
import PublishedExperience from "./published-experience";
import PasswordGate from "./password-gate";
import { validSlug } from "@/lib/security";
import { hasPageAccess } from "@/lib/page-access";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

const LOCKED_TITLE = "עמוד מוגן בסיסמה | Linkli";
const LOCKED_DESCRIPTION = "העמוד הזה משותף באופן פרטי. יש להזין את הסיסמה שקיבלתם כדי לצפות בו.";

// Personal pages are shared privately over WhatsApp; they are never indexed by default.
const PRIVATE_ROBOTS: Metadata["robots"] = { index: false, follow: false, noarchive: true, googleBot: { index: false, follow: false } };

async function getPublishedProject(slug: string) {
  if (!validSlug(slug)) return null;
  const db = await ensureDatabase();
  return db.prepare(
    `SELECT projects.*, users.plan AS owner_plan, users.plan_tier AS owner_plan_tier
     FROM projects JOIN users ON users.email = projects.owner_email
     WHERE projects.slug = ? AND projects.published = 1`
  ).bind(slug).first();
}

/** A stored password hash locks the page regardless of the owner's current plan. */
function isLocked(row: { access_password_hash?: unknown }) {
  return typeof row.access_password_hash === "string" && row.access_password_hash.length > 0;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getPublishedProject(slug);
  if (!row) return { title: "העמוד לא נמצא | Linkli", robots: PRIVATE_ROBOTS };
  if (isLocked(row)) {
    return {
      title: LOCKED_TITLE,
      description: LOCKED_DESCRIPTION,
      robots: PRIVATE_ROBOTS,
      openGraph: { title: LOCKED_TITLE, description: LOCKED_DESCRIPTION, type: "website", images: [{ url: "https://linkli.online/og-marketing.jpg", width: 1200, height: 630, alt: "Linkli" }] },
      twitter: { card: "summary_large_image", title: LOCKED_TITLE, description: LOCKED_DESCRIPTION, images: ["https://linkli.online/og-marketing.jpg"] },
    };
  }
  const project = projectFromRow(row);
  const title = `${project.config.headline} | Linkli`;
  const description = project.config.subtitle;
  const image = absoluteUrl(`/api/public/${slug}/og`);
  return {
    title,
    description,
    robots: PRIVATE_ROBOTS,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function PublishedPage({ params }: Props) {
  const { slug } = await params;
  const row = await getPublishedProject(slug);
  if (!row) notFound();
  const project = projectFromRow(row);
  const ownerPlan = planFromUserRow({ plan: row.owner_plan, plan_tier: row.owner_plan_tier });
  if (isLocked(row) && !(await hasPageAccess(slug, String(row.access_password_hash)))) {
    return <PasswordGate slug={slug} title="עמוד מוגן בסיסמה" emoji="✉️" accent={project.config.accent} accentSoft={project.config.accentSoft} />;
  }
  return <PublishedExperience slug={slug} templateId={project.templateId} config={applyPlanToConfig(project.config, ownerPlan)} showWatermark={!isPaidPlan(ownerPlan)} />;
}
