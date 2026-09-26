import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, DownloadSimple, PencilSimple, UsersThree } from "@phosphor-icons/react/ssr";
import { ensureDatabase } from "@/db";
import { requireProductUser } from "@/lib/auth";
import { formatCount, formatRelativeDate } from "@/lib/format";
import { projectFromRow } from "@/lib/projects";
import { listProjectRsvps } from "@/lib/rsvp";
import { validUuid } from "@/lib/security";
import AppShell from "@/app/app-shell/app-shell";
import { ButtonLink } from "@/app/ui/button";
import { Badge, EmptyState, Notice, PageHeader } from "@/app/ui/status";
import DeleteResponseButton from "./delete-response-button";
import "./guests.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "אישורי הגעה | Linkli", robots: { index: false, follow: false } };

const PAGE_SIZE = 50;
const STATUS = {
  yes: { label: "מגיעים", tone: "success" },
  maybe: { label: "לא בטוחים", tone: "warning" },
  no: { label: "לא מגיעים", tone: "neutral" },
} as const;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function GuestsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const user = await requireProductUser(`/studio/${id}/guests`);
  if (!validUuid(id)) notFound();
  const db = await ensureDatabase();
  const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
  if (!row) notFound();
  const project = projectFromRow(row);
  const query = await searchParams;
  const requestedPage = Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1;
  const page = Math.max(1, Math.floor(requestedPage));
  const data = await listProjectRsvps(db, id, user.email, (page - 1) * PAGE_SIZE, PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(data.summary.total / PAGE_SIZE));
  const enabled = project.config.rsvpEnabled === true;

  return (
    <AppShell user={user} current="pages">
      <PageHeader
        title="אישורי הגעה"
        lead={<>עבור <Link href={`/studio/${id}`} className="ui-link">{project.title}</Link>{project.published ? null : " · העמוד עוד לא פורסם"}</>}
        actions={<>
          <ButtonLink href={`/studio/${id}`} icon={<PencilSimple aria-hidden="true" />}>עריכת העמוד</ButtonLink>
          {data.summary.total ? <a className="ui-button" href={`/api/projects/${id}/rsvp/export.csv`} download><DownloadSimple aria-hidden="true" />ייצוא ל־Excel</a> : null}
        </>}
      >
        <Link href="/studio" className="guests-back"><ArrowRight aria-hidden="true" />העמודים שלי</Link>
      </PageHeader>

      {!enabled ? (
        <Notice tone="warning" title="אישורי ההגעה כבויים בעמוד הזה" className="guests-notice" actions={<ButtonLink href={`/studio/${id}?section=guests`} size="sm">הפעלה בעורך</ButtonLink>}>
          אורחים לא יכולים לשלוח מענה עד שמפעילים את האפשרות. מענים שכבר התקבלו נשמרים כאן.
        </Notice>
      ) : null}

      <dl className="guests-summary" aria-label="סיכום">
        <div className="is-primary"><dt>אורחים מגיעים</dt><dd>{formatCount(data.summary.guests)}</dd></div>
        <div><dt>מענים</dt><dd>{formatCount(data.summary.total)}</dd></div>
        <div><dt>מגיעים</dt><dd>{formatCount(data.summary.yes)}</dd></div>
        <div><dt>לא בטוחים</dt><dd>{formatCount(data.summary.maybe)}</dd></div>
        <div><dt>לא מגיעים</dt><dd>{formatCount(data.summary.no)}</dd></div>
      </dl>

      {data.songs.length ? (
        <section className="guests-songs" aria-labelledby="guests-songs-title">
          <h2 className="ui-section-title" id="guests-songs-title">בקשות לשירים</h2>
          <ul>{data.songs.map((song) => <li key={song}>{song}</li>)}</ul>
        </section>
      ) : null}

      {data.responses.length ? (
        <section aria-labelledby="guests-list-title">
          <h2 className="ui-section-title guests-list-title" id="guests-list-title">כל המענים</h2>
          <div className="ui-table-wrap">
            <table className="ui-table guests-table">
              <thead>
                <tr><th scope="col">שם</th><th scope="col">מענה</th><th scope="col" className="num">אורחים</th><th scope="col">שיר</th><th scope="col">תשובות</th><th scope="col">התקבל</th><th scope="col"><span className="sr-only">פעולות</span></th></tr>
              </thead>
              <tbody>
                {data.responses.map((response) => (
                  <tr key={response.id}>
                    <th scope="row">{response.name}</th>
                    <td data-label="מענה"><Badge tone={STATUS[response.status].tone}>{STATUS[response.status].label}</Badge></td>
                    <td data-label="אורחים" className="num">{response.guestCount}</td>
                    <td data-label="שיר">{response.song || "-"}</td>
                    <td data-label="תשובות" className="guests-answers">{response.answers.filter(Boolean).join(" · ") || "-"}</td>
                    <td data-label="התקבל" className="guests-date">{formatRelativeDate(response.createdAt)}</td>
                    <td className="guests-actions"><DeleteResponseButton projectId={id} responseId={response.id} name={response.name} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 ? (
            <nav className="guests-pagination" aria-label="דפי מענים">
              {page > 1 ? <ButtonLink href={`/studio/${id}/guests?page=${page - 1}`} size="sm">הקודמים</ButtonLink> : <span />}
              <span>עמוד {page} מתוך {pages}</span>
              {page < pages ? <ButtonLink href={`/studio/${id}/guests?page=${page + 1}`} size="sm">הבאים</ButtonLink> : <span />}
            </nav>
          ) : null}
        </section>
      ) : (
        <section className="ui-panel">
          <EmptyState icon={<UsersThree weight="duotone" />} title="עוד אין מענים">
            {project.published ? "ברגע שאורח ימלא את טופס האישור, הוא יופיע כאן." : "אחרי שתפרסמו ותשלחו את ההזמנה, המענים יופיעו כאן."}
          </EmptyState>
        </section>
      )}
    </AppShell>
  );
}
