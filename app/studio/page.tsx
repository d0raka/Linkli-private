import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Cake, Confetti, Heart, Plus } from "@phosphor-icons/react/ssr";
import { ensureDatabase } from "@/db";
import { requireProductUser } from "@/lib/auth";
import { loadDashboardPages } from "@/lib/dashboard";
import { getPlanName, pageLimit } from "@/lib/plans";
import { validUuid } from "@/lib/security";
import AppShell from "@/app/app-shell/app-shell";
import { ButtonLink } from "@/app/ui/button";
import { EmptyState, Notice, PageHeader } from "@/app/ui/status";
import PageCard from "./dashboard/page-card";
import "./dashboard/dashboard.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "העמודים שלי | Linkli", robots: { index: false, follow: false } };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const edit = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  if (edit && validUuid(edit)) redirect(`/studio/${edit}`);

  const user = await requireProductUser("/studio");
  const db = await ensureDatabase();
  const pages = await loadDashboardPages(db, user.email, user.plan);
  const limit = pageLimit(user.plan, user.bonusPages);
  const published = pages.filter((page) => page.published).length;
  const atLimit = published >= limit && pages.some((page) => !page.published);
  const planName = getPlanName(user.plan);
  const usage = user.plan === "free"
    ? `מסלול ${planName}: עמוד מפורסם אחד, טיוטות ללא הגבלה.`
    : `${published} מתוך ${limit} עמודים מפורסמים במסלול ${planName}.`;

  return (
    <AppShell user={user} current="pages">
      <PageHeader
        title="העמודים שלי"
        lead={pages.length ? usage : undefined}
      />

      {atLimit ? (
        <Notice
          tone="accent"
          title="הגעתם למכסת העמודים המפורסמים"
          actions={<ButtonLink href="/pricing" size="sm" variant="primary">להשוואת מסלולים</ButtonLink>}
          className="dashboard-notice"
        >
          טיוטות אפשר להמשיך לשמור. כדי לפרסם עוד עמוד, מורידים עמוד אחר מהאוויר או עוברים למסלול עם יותר מקום.
        </Notice>
      ) : null}

      {pages.length ? (
        <ul className="page-grid" aria-label="העמודים שלי">
          {pages.map((page) => (
            <li key={page.id}><PageCard page={page} /></li>
          ))}
        </ul>
      ) : (
        <section className="dashboard-empty ui-panel">
          <EmptyState
            icon={<Confetti weight="duotone" />}
            title="בואו נכין את העמוד הראשון"
            actions={<ButtonLink href="/studio/create" variant="primary" icon={<Plus aria-hidden="true" weight="bold" />}>בחירת תבנית</ButtonLink>}
          >
            בוחרים רגע, משנים כמה מילים ושולחים קישור בוואטסאפ. העמוד הראשון בחינם.
          </EmptyState>
          <div className="dashboard-quickstart">
            <p>או מתחילים משאלון קצר:</p>
            <ul>
              <li><ButtonLink href="/create/birthday" icon={<Cake aria-hidden="true" />}>הפתעת יום הולדת</ButtonLink></li>
              <li><ButtonLink href="/create/wedding" icon={<Heart aria-hidden="true" />}>הזמנה לחתונה</ButtonLink></li>
              <li><ButtonLink href="/create/event" icon={<Confetti aria-hidden="true" />}>הזמנה לאירוע</ButtonLink></li>
            </ul>
          </div>
        </section>
      )}
    </AppShell>
  );
}
