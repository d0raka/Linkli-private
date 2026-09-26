import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PublishedExperience from "@/app/p/[slug]/published-experience";
import { getTemplate, safeConfig, templates } from "@/lib/templates";
import { campaignFromObject, withCampaign } from "@/lib/marketing";
import MarketingTracker from "@/app/marketing-tracker";
import "@/app/styles/experience.css";

type Props = { params: Promise<{ templateId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { templateId } = await params;
  const template = getTemplate(templateId === "rsvp" ? "event" : templateId);
  if (template.id !== (templateId === "rsvp" ? "event" : templateId)) return { title: "תבנית לא נמצאה | Linkli", robots: { index: false, follow: false } };
  const title = `${template.name} — תבנית אינטראקטיבית | Linkli`;
  return {
    title,
    description: template.description,
    alternates: { canonical: `/preview/${template.id}` },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description: template.description,
      type: "website",
      images: [{ url: "https://linkli.online/og-marketing.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: template.description,
      images: ["https://linkli.online/og-marketing.jpg"],
    },
  };
}

export function generateStaticParams() {
  return templates.map((template) => ({ templateId: template.id }));
}

export default async function TemplatePreviewPage({ params, searchParams }: Props) {
  const { templateId } = await params;
  if (templateId === "rsvp") redirect("/preview/event");
  const template = getTemplate(templateId);
  if (template.id !== templateId) notFound();
  const rawParams = await searchParams;
  const flatParams = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] || "" : value || ""]));
  const campaign = campaignFromObject(flatParams);
  const embedded = flatParams.embed === "1";
  const createHref = withCampaign(`/register?returnTo=${encodeURIComponent(`/studio/create?template=${template.id}`)}`, campaign);

  return <><MarketingTracker campaign={campaign} templateId={template.id} /><PublishedExperience slug={`preview-${template.id}`} templateId={template.id} config={safeConfig({ ...template.config, ...(embedded ? { showFallingEmojis: false } : {}) }, template.id)} showWatermark trackAnalytics={false} previewMode embedded={embedded} previewCtaHref={createHref} previewCtaLabel={template.free ? "יצירת התבנית בחינם" : "יצירה במסלול יוצר"} /></>;
}
