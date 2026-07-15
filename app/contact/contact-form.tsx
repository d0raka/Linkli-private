"use client";

import { FormEvent, useState } from "react";

export default function ContactForm() {
  const [topic, setTopic] = useState(() => {
    if (typeof window === "undefined") return "general";
    const value = new URLSearchParams(window.location.search).get("topic");
    return ["general", "billing", "accessibility", "privacy", "technical"].includes(value || "") ? value! : "general";
  });
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setStatus(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form.entries())) });
    const data = await response.json(); setSending(false);
    if (!response.ok) return setStatus({ text: data.error || "לא הצלחנו לשלוח את הפנייה", error: true });
    event.currentTarget.reset(); setTopic("general"); setStatus({ text: "הפנייה התקבלה. תודה שכתבתם לנו 💌" });
  }

  return <form className="contact-form" onSubmit={submit}>
    <label>שם מלא<input name="name" required maxLength={80} autoComplete="name" /></label>
    <label>דוא״ל לחזרה<input name="email" type="email" required maxLength={160} autoComplete="email" /></label>
    <label className="full">נושא<select name="topic" value={topic} onChange={(event) => setTopic(event.target.value)}><option value="general">שאלה כללית</option><option value="billing">חיוב, ביטול או החזר</option><option value="accessibility">נגישות</option><option value="privacy">פרטיות ומידע אישי</option><option value="technical">תקלה טכנית</option></select></label>
    <label className="full">כתובת העמוד הרלוונטי - לא חובה<input name="pageUrl" type="url" maxLength={500} placeholder="https://..." /></label>
    <label className="contact-honeypot" aria-hidden="true">אין למלא שדה זה<input name="company" tabIndex={-1} autoComplete="off" /></label>
    <label className="full">איך אפשר לעזור?<textarea name="message" required minLength={10} maxLength={3000} /></label>
    <div className="full">{status && <div role="status" className={`status-message ${status.error ? "error" : ""}`}>{status.text}</div>}<button className="button button-primary" disabled={sending}>{sending ? "שולחים…" : "שליחת הפנייה"}</button></div>
  </form>;
}
