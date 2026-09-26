import type { Metadata } from "next";
import { requireProductUser } from "@/lib/auth";
import { isPaidPlan } from "@/lib/plans";
import { normalizeTemplateId, templates } from "@/lib/templates";
import AppShell from "@/app/app-shell/app-shell";
import { PageHeader } from "@/app/ui/status";
import TemplateGallery, { type GalleryTemplate } from "./template-gallery";
import "./gallery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "עמוד חדש | Linkli", robots: { index: false, follow: false } };

const INVITATIONS = ["wedding", "event", "brit", "mitzvah", "henna"];
const GREETINGS = ["birthday", "date", "love-note", "gift", "memories", "custom-blank"];

function toGalleryTemplate(id: string, paid: boolean): GalleryTemplate {
  const template = templates.find((item) => item.id === id)!;
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    emoji: template.emoji,
    headline: template.config.headline,
    accent: template.config.accent,
    accentSoft: template.config.accentSoft,
    locked: !template.free && !paid,
  };
}

export default async function CreatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireProductUser("/studio/create");
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || "";
  const requested = normalizeTemplateId(first(params.template));
  const launch = templates.some((template) => template.id === requested) ? requested : "";
  const draft = /^[A-Za-z0-9_-]{1,64}$/.test(first(params.draft)) ? first(params.draft) : "";
  const paid = isPaidPlan(user.plan);

  return (
    <AppShell user={user} current="pages">
      <PageHeader title="איזה רגע מתכננים?" lead="כל תבנית כבר כתובה ומעוצבת. בוחרים אחת, משנים את המילים, ושולחים קישור." />
      <TemplateGallery
        plan={user.plan}
        email={user.email}
        launchTemplate={launch}
        launchDraft={draft}
        groups={[
          { id: "invitations", title: "הזמנות ואירועים", lead: "עם פרטי האירוע, ניווט, יומן ואישורי הגעה.", templates: INVITATIONS.map((id) => toGalleryTemplate(id, paid)) },
          { id: "greetings", title: "ברכות והפתעות", lead: "כמה שאלות קטנות, ואז הרגע שבשבילו שלחתם.", templates: GREETINGS.map((id) => toGalleryTemplate(id, paid)) },
        ]}
      />
    </AppShell>
  );
}
