import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublishedExperience from "@/app/p/[slug]/published-experience";
import { templates } from "@/lib/templates";

type Props = { params: Promise<{ templateId: string }> };

export const metadata: Metadata = {
  title: "תצוגה מקדימה של תבנית | Linkli",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return templates.map((template) => ({ templateId: template.id }));
}

export default async function TemplatePreviewPage({ params }: Props) {
  const { templateId } = await params;
  const template = templates.find((item) => item.id === templateId);
  if (!template) notFound();

  return <PublishedExperience slug={`preview-${template.id}`} config={template.config} showWatermark trackAnalytics={false} previewMode />;
}
