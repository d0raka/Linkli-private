"use client";

import { type FormEvent, useState } from "react";
import type { CampaignAttribution } from "@/lib/marketing";

export default function MarketingWaitlistForm({ campaign, compact = false, defaultEmail = "" }: { campaign?: CampaignAttribution; compact?: boolean; defaultEmail?: string }) {
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/marketing/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(data.entries()),
        ...(campaign || {}),
        contactConsent: data.get("contactConsent") === "on",
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) return setStatus({ text: body.error || "לא הצלחנו לשמור את הפרטים", error: true });
    form.reset();
    setStatus({ text: "הפנייה נתקלה בהצלחה! צוות Linkli Max יחזור אליכם בהקדם ✨" });
  }

  return <form className={`marketing-waitlist-form ${compact ? "compact" : ""}`} onSubmit={submit}>
    <label>שם<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
    <label>דוא״ל<input name="email" type="email" required maxLength={160} autoComplete="email" dir="ltr" defaultValue={defaultEmail} /></label>
    <label>מה תרצו ליצור?<select name="useCase" defaultValue="events"><option value="events">אירועים והזמנות</option><option value="birthdays">ימי הולדת והפתעות</option><option value="couples">זוגיות ודייטים</option><option value="creators">תוכן וקהל</option><option value="business">שימוש עסקי</option><option value="other">משהו אחר</option></select></label>
    <label className="contact-honeypot" aria-hidden="true">חברה<input name="company" tabIndex={-1} autoComplete="off" /></label>
    <label className="waitlist-consent"><input name="contactConsent" type="checkbox" required /><span>אני מאשר/ת ל־Linkli ליצור איתי קשר בנושא Linkli Max.</span></label>
    {status ? <div className={`status-message ${status.error ? "error" : ""}`} role="status">{status.text}</div> : null}
    <button className="button button-primary" disabled={sending}>{sending ? "שולחים פנייה…" : "שליחת פנייה ל-Linkli Max 🚀"}</button>
  </form>;
}
