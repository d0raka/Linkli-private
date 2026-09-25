"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { PlanLockLayer } from "./plan-lock";
import type { PlanType } from "@/lib/plans";

type RsvpRow = {
  id: string;
  status: "yes" | "maybe" | "no";
  guestCount: number;
  plusOnes: string[];
  song: string;
  answers: string[];
  name: string;
  createdAt: string;
};

type Dashboard = {
  summary: { total: number; yes: number; maybe: number; no: number; guests: number };
  songs: string[];
  responses: RsvpRow[];
};

const STATUS_LABEL: Record<RsvpRow["status"], string> = {
  yes: "מגיע/ה",
  maybe: "לא בטוח/ה",
  no: "לא מגיע/ה",
};

export default function RsvpDashboard({
  projectId,
  published,
  enabled,
  notifyOwner,
  plan,
  onEnabled,
  onNotify,
  onRequirePlan,
}: {
  projectId: string;
  published: boolean;
  enabled: boolean;
  notifyOwner: boolean;
  plan?: PlanType | string | null;
  onEnabled: (value: boolean) => void;
  onNotify: (value: boolean) => void;
  onRequirePlan: (feature: "eventTools") => void;
}) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    if (!published) return;
    try {
      const payload = await apiFetch<Dashboard>(`/api/projects/${projectId}/rsvp`);
      setData(payload);
      setError("");
    } catch (caught) {
      setError(errorMessage(caught, "לא הצלחנו לטעון את אישורי ההגעה."));
    }
  }, [projectId, published]);

  useEffect(() => {
    if (!published) return;
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load, published]);

  async function remove(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/api/projects/${projectId}/rsvp/${id}`, { method: "DELETE", json: {} });
      await load();
    } catch (caught) {
      setError(errorMessage(caught, "לא הצלחנו למחוק את המענה."));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="form-section editor-stage-fields">
      <div className="stage-content-heading full">
        <span>אורחים</span>
        <h3>אישורי הגעה אמיתיים</h3>
        <p>המענים נשמרים אצלכם. אפשר לייצא ל-CSV, למחוק רשומה, ולקבל עדכון בדוא״ל.</p>
      </div>
      <PlanLockLayer feature="eventTools" plan={plan} onUnlock={() => onRequirePlan("eventTools")} name="אישורי הגעה">
        <label className="full">
          <span className="field-label"><b>קבלת אישורי הגעה</b><small>נשמר אחרי שהאורח ממלא ומסכים</small></span>
          <input type="checkbox" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} />
        </label>
        <label className="full">
          <span className="field-label"><b>עדכון בדוא״ל על מענה חדש</b><small>אופציונלי, בלי לשלוח תזכורות</small></span>
          <input type="checkbox" checked={notifyOwner} onChange={(event) => onNotify(event.target.checked)} />
        </label>
      </PlanLockLayer>
      {!published ? <p className="editor-stage-tip">אחרי הפרסום יופיעו כאן המענים האמיתיים.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {data ? (
        <>
          <ul className="studio-activity-strip" aria-label="סיכום אישורי הגעה">
            <li><strong>{data.summary.total}</strong><span>מענים</span></li>
            <li><strong>{data.summary.yes}</strong><span>מגיעים</span></li>
            <li><strong>{data.summary.maybe}</strong><span>לא בטוחים</span></li>
            <li><strong>{data.summary.no}</strong><span>לא מגיעים</span></li>
            <li><strong>{data.summary.guests}</strong><span>אורחים</span></li>
          </ul>
          {data.songs.length ? <p>בקשות שיר: {data.songs.join(" · ")}</p> : null}
          <a className="button button-outline button-small" href={`/api/projects/${projectId}/rsvp/export.csv`}>ייצוא CSV</a>
          <div className="live-link-grid">
            {data.responses.map((row) => (
              <article className="live-link-card" key={row.id}>
                <div className="live-link-info">
                  <div>
                    <h3>{row.name}</h3>
                    <p>{STATUS_LABEL[row.status]} · {row.guestCount} אורחים{row.song ? ` · ${row.song}` : ""}</p>
                  </div>
                  <button type="button" className="live-link-delete" disabled={busyId === row.id} onClick={() => remove(row.id)} aria-label={`מחיקת המענה של ${row.name}`}>×</button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
