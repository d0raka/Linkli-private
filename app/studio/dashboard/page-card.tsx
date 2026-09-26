import Link from "next/link";
import type { CSSProperties } from "react";
import { ChatCircleDots, Eye, Lock, UsersThree } from "@phosphor-icons/react/ssr";
import { pageStage, type DashboardPage } from "@/lib/dashboard";
import { emojiImageUrl } from "@/lib/background-image";
import { formatCount, formatRelativeDate } from "@/lib/format";
import { Badge } from "@/app/ui/status";
import PageCardActions from "./page-card-actions";

const STAGE_BADGE = {
  draft: { tone: "neutral", label: "טיוטה", live: false },
  "live-unseen": { tone: "success", label: "באוויר", live: true },
  live: { tone: "success", label: "באוויר", live: true },
} as const;

/** One page in the dashboard: a thumbnail of the invitation itself, its state, and the next useful action. */
export default function PageCard({ page }: { page: DashboardPage }) {
  const stage = pageStage(page);
  const badge = STAGE_BADGE[stage];
  const editHref = `/studio/${page.id}`;
  const titleId = `page-${page.id}-title`;

  return (
    <article className="page-card" aria-labelledby={titleId} style={{ "--thumb-accent": page.accent, "--thumb-soft": page.accentSoft } as CSSProperties}>
      <Link href={editHref} className="page-card__thumb" tabIndex={-1} aria-hidden="true">
        <span className="page-card__emoji">
          {page.emojiImageVersion ? <img src={emojiImageUrl(page.slug, page.emojiImageVersion)} alt="" /> : page.emoji}
        </span>
        <span className="page-card__headline">{page.headline}</span>
      </Link>

      <div className="page-card__body">
        <div className="page-card__status">
          <Badge tone={badge.tone} live={badge.live}>{badge.label}</Badge>
          {page.passwordProtected ? <Badge><Lock aria-hidden="true" weight="bold" />מוגן בסיסמה</Badge> : null}
        </div>
        <h2 className="page-card__title" id={titleId}><Link href={editHref}>{page.title}</Link></h2>
        <p className="page-card__meta">{page.templateName !== page.title ? `${page.templateName} · ` : ""}עודכן {formatRelativeDate(page.updatedAt)}</p>

        {page.published ? (
          <dl className="page-card__stats">
            <div><dt><Eye aria-hidden="true" />צפיות</dt><dd>{formatCount(page.views)}</dd></div>
            {page.rsvp ? (
              <div><dt><UsersThree aria-hidden="true" />מגיעים</dt><dd>{formatCount(page.rsvp.guests)}</dd></div>
            ) : (
              <div><dt><ChatCircleDots aria-hidden="true" />תגובות</dt><dd>{formatCount(page.clicks)}</dd></div>
            )}
          </dl>
        ) : (
          <p className="page-card__hint">עוד לא נשלח. אחרי הפרסום יהיה לו קישור לשיתוף.</p>
        )}
      </div>

      <PageCardActions
        id={page.id}
        slug={page.slug}
        title={page.title}
        headline={page.headline}
        subtitle={page.subtitle}
        emoji={page.emoji}
        published={page.published}
        hasRsvp={Boolean(page.rsvp)}
        rsvpResponses={page.rsvp?.responses ?? 0}
      />
    </article>
  );
}
