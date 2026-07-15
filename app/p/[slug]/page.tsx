import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensureDatabase } from "@/db";
import { projectFromRow } from "@/lib/projects";
import { isAdminEmail } from "@/lib/auth";
import PublishedExperience from "./published-experience";
import { validSlug } from "@/lib/security";

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
  return { title: `${project.config.headline} | Linkli`, description: project.config.subtitle };
}

export default async function PublishedPage({ params }: Props) {
  const { slug } = await params;
  const row = await getPublishedProject(slug);
  if (!row) notFound();
  const project = projectFromRow(row);
  return <PublishedExperience slug={slug} config={project.config} showWatermark={row.owner_plan !== "plus" && !isAdminEmail(String(row.owner_email))} />;
}
