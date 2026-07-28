import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensureDatabase } from "@/db";
import { projectFromRow } from "@/lib/projects";
import { isAdminEmail } from "@/lib/auth";
import PublishedExperience from "./published-experience";
import PasswordGate from "./password-gate";
import { validSlug } from "@/lib/security";
import { hasPageAccess } from "@/lib/page-access";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

async function getPublishedProject(slug: string) {
  if (!validSlug(slug)) return null;
  const db = await ensureDatabase();
  return db.prepare(
    `SELECT projects.*, users.plan AS owner_plan
     FROM projects JOIN users ON users.email = projects.owner_email
     WHERE projects.slug = ? AND projects.published = 1`
  ).bind(slug).first();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getPublishedProject(slug);
  if (!row) return { title: "העמוד לא נמצא | Linkli" };
  const project = projectFromRow(row);
  const title = `${project.config.headline} | Linkli`;
  const description = project.config.subtitle;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "https://linkli.online/og-marketing.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://linkli.online/og-marketing.png"],
    },
  };
}

export default async function PublishedPage({ params }: Props) {
  const { slug } = await params;
  const row = await getPublishedProject(slug);
  if (!row) notFound();
  const project = projectFromRow(row);
  if (row.access_password_hash && !(await hasPageAccess(slug, String(row.access_password_hash)))) {
    return <PasswordGate slug={slug} title={project.config.headline} emoji={project.config.emoji} accent={project.config.accent} accentSoft={project.config.accentSoft} />;
  }
  return <PublishedExperience slug={slug} templateId={project.templateId} config={project.config} showWatermark={row.owner_plan !== "plus" && !isAdminEmail(String(row.owner_email))} />;
}
