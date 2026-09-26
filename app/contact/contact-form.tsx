"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { Button } from "@/app/ui/button";
import { Notice } from "@/app/ui/status";

const TOPICS = [
  ["general", "שאלה כללית"],
  ["billing", "תשלום, ביטול או החזר"],
  ["accessibility", "נגישות"],
  ["privacy", "פרטיות ומידע אישי"],
  ["technical", "תקלה טכנית"],
] as const;

export default function ContactForm() {
  const id = useId();
  const [topic, setTopic] = useState("general");
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const value = new URLSearchParams(window.location.search).get("topic");
      if (TOPICS.some(([key]) => key === value)) setTopic(value!);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await apiFetch("/api/contact", { method: "POST", json: Object.fromEntries(form.entries()) });
      formElement.reset();
      setTopic("general");
      setStatus({ text: "הפנייה התקבלה. נחזור אליכם לכתובת הדוא״ל שמסרתם." });
    } catch (caught) {
      setStatus({ text: errorMessage(caught, "לא הצלחנו לשלוח את הפנייה"), error: true });
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="contact-form" method="post" action="/api/forms/noscript" onSubmit={submit}>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-name`}>שם</label>
        <input id={`${id}-name`} className="ui-input" name="name" required maxLength={80} autoComplete="name" />
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-email`}>דוא״ל לתשובה</label>
        <input id={`${id}-email`} className="ui-input" name="email" type="email" required maxLength={160} autoComplete="email" dir="ltr" />
      </div>
      <div className="ui-field is-wide">
        <label className="ui-label" htmlFor={`${id}-topic`}>נושא</label>
        <select id={`${id}-topic`} className="ui-input" name="topic" value={topic} onChange={(event) => setTopic(event.target.value)}>
          {TOPICS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <div className="ui-field is-wide">
        <label className="ui-label" htmlFor={`${id}-page`}>כתובת העמוד הרלוונטי <small>(לא חובה)</small></label>
        <input id={`${id}-page`} className="ui-input" name="pageUrl" type="url" maxLength={500} placeholder="https://linkli.online/p/..." dir="ltr" />
      </div>
      <label className="auth-honeypot" aria-hidden="true">אין למלא שדה זה<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <div className="ui-field is-wide">
        <label className="ui-label" htmlFor={`${id}-message`}>איך אפשר לעזור?</label>
        <textarea id={`${id}-message`} className="ui-input" name="message" required minLength={10} maxLength={3000} rows={6} />
      </div>
      <div className="contact-form__submit is-wide">
        {status ? <Notice tone={status.error ? "danger" : "success"}>{status.text}</Notice> : null}
        <Button type="submit" variant="primary" loading={sending} loadingLabel="שולחים…">שליחת הפנייה</Button>
      </div>
    </form>
  );
}
