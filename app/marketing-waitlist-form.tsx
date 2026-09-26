"use client";

import { type FormEvent, useId, useState } from "react";
import type { CampaignAttribution } from "@/lib/marketing";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { Button } from "@/app/ui/button";
import { Notice } from "@/app/ui/status";

const COPY = {
  business: { consent: "אני מסכים/ה ש-Linkli תיצור איתי קשר לגבי מסלול ארגונים.", done: "הפרטים נשמרו. נחזור אליכם כשמסלול ארגונים ייפתח.", submit: "הצטרפות לרשימת ההמתנה" },
  payment: { consent: "אני מסכים/ה ש-Linkli תעדכן אותי כשאפשר יהיה לשלם.", done: "הפרטים נשמרו. נעדכן אתכם ברגע שהתשלום ייפתח.", submit: "עדכנו אותי" },
} as const;

/** Lead capture for plans that cannot be bought yet: the Business waitlist, or checkout before payments open. */
export default function MarketingWaitlistForm({ campaign, compact = false, defaultEmail = "", purpose = "business" }: { campaign?: CampaignAttribution; compact?: boolean; defaultEmail?: string; purpose?: keyof typeof COPY }) {
  const copy = COPY[purpose];
  const id = useId();
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await apiFetch("/api/marketing/waitlist", {
        method: "POST",
        json: { ...Object.fromEntries(data.entries()), ...(campaign || {}), contactConsent: data.get("contactConsent") === "on" },
      });
      form.reset();
      setStatus({ text: copy.done });
    } catch (caught) {
      setStatus({ text: errorMessage(caught, "לא הצלחנו לשמור את הפרטים"), error: true });
    } finally {
      setSending(false);
    }
  }

  return (
    <form className={`waitlist-form ${compact ? "is-compact" : ""}`} method="post" action="/api/forms/noscript" onSubmit={submit}>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-name`}>שם</label>
        <input id={`${id}-name`} className="ui-input" name="name" required minLength={2} maxLength={80} autoComplete="name" />
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-email`}>דוא״ל</label>
        <input id={`${id}-email`} className="ui-input" name="email" type="email" required maxLength={160} autoComplete="email" dir="ltr" defaultValue={defaultEmail} />
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-use`}>למה תשתמשו ב-Linkli?</label>
        <select id={`${id}-use`} className="ui-input" name="useCase" defaultValue={purpose === "business" ? "business" : "events"}>
          <option value="events">אירועים והזמנות</option>
          <option value="birthdays">ימי הולדת והפתעות</option>
          <option value="couples">זוגיות ודייטים</option>
          <option value="creators">תוכן וקהל</option>
          <option value="business">שימוש עסקי</option>
          <option value="other">משהו אחר</option>
        </select>
      </div>
      <label className="auth-honeypot" aria-hidden="true">חברה<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <label className="ui-check">
        <input name="contactConsent" type="checkbox" required />
        <span>{copy.consent}</span>
      </label>
      {status ? <Notice tone={status.error ? "danger" : "success"}>{status.text}</Notice> : null}
      <Button type="submit" variant="primary" loading={sending} loadingLabel="שולחים…">{copy.submit}</Button>
    </form>
  );
}
