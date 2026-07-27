import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublishedExperience from "@/app/p/[slug]/published-experience";
import { templates } from "@/lib/templates";
import { campaignFromObject, withCampaign } from "@/lib/marketing";
import MarketingTracker from "@/app/marketing-tracker";

type Props = { params: Promise<{ templateId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { templateId } = await params;
  const template = templates.find((item) => item.id === templateId);
  if (!template) return { title: "תבנית לא נמצאה | Linkli", robots: { index: false, follow: false } };
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
      images: [{ url: "https://linkli.online/og-marketing.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: template.description,
      images: ["https://linkli.online/og-marketing.png"],
    },
  };
}

export function generateStaticParams() {
  return templates.map((template) => ({ templateId: template.id }));
}

export default async function TemplatePreviewPage({ params, searchParams }: Props) {
  const { templateId } = await params;
  const template = templates.find((item) => item.id === templateId);
  if (!template) notFound();
  const rawParams = await searchParams;
  const flatParams = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] || "" : value || ""]));
  const campaign = campaignFromObject(flatParams);
  const createHref = withCampaign(`/register?returnTo=${encodeURIComponent(`/studio/create?template=${template.id}`)}`, campaign);

  return <><MarketingTracker campaign={campaign} templateId={template.id} /><PublishedExperience slug={`preview-${template.id}`} config={template.config} showWatermark trackAnalytics={false} previewMode previewCtaHref={createHref} /></>;
}
