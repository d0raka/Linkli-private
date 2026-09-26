import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProductUser } from "@/lib/auth";
import { applyPlanToConfig, isPaidPlan } from "@/lib/plans";
import { ensureDatabase } from "@/db";
import { projectFromRow } from "@/lib/projects";
import { validUuid } from "@/lib/security";
import DraftPreviewClient from "./draft-preview-client";
import "@/app/styles/experience.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "תצוגת טיוטה | Linkli",
  robots: { index: false, follow: false },
};

export default async function DraftPreviewPage({ params }: Props) {
  const { id } = await params;
  const user = await requireProductUser(`/studio/preview/${id}`);
  if (!validUuid(id)) notFound();

  const db = await ensureDatabase();
  const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
  if (!row) notFound();

  const project = projectFromRow(row);
  return (
    <DraftPreviewClient
      projectId={project.id}
      slug={project.slug}
      templateId={project.templateId}
      config={applyPlanToConfig(project.config, user.plan)}
      plan={user.plan}
      showWatermark={!isPaidPlan(user.plan)}
    />
  );
}
