"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiFetch, errorMessage, safeRelativePath } from "@/lib/api-client";

export default function ForgotPasswordForm() {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [localResetUrl, setLocalResetUrl] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setMessage(""); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const payload = await apiFetch<{ message?: string; localResetUrl?: string }>("/api/auth/password/forgot", { method: "POST", json: { email: data.get("email") } });
      setLocalResetUrl(payload.localResetUrl ? safeRelativePath(new URL(payload.localResetUrl, window.location.origin).pathname + new URL(payload.localResetUrl, window.location.origin).search, "") : "");
      setMessage(payload.message || "אם קיים חשבון עם הכתובת שהזנת, תישלח אליו הודעה עם קישור לאיפוס הסיסמה.");
    } catch (caught) {
      setError(errorMessage(caught, "לא הצלחנו לשלוח את הבקשה. נסו שוב בעוד כמה דקות."));
    } finally {
      setSending(false);
    }
  }

  if (message) return <div className="auth-complete">
    <div className="auth-complete-icon">{localResetUrl ? "🔓" : "✉️"}</div>
    <h2>{localResetUrl ? "קישור האיפוס המקומי מוכן" : "כדאי לבדוק את תיבת הדוא״ל"}</h2>
    <p>{localResetUrl ? "שליחת המייל אינה מוגדרת בסביבת הפיתוח. אפשר להמשיך ישירות לבחירת סיסמה חדשה." : message}</p>
    {localResetUrl ? <a href={localResetUrl} className="button button-primary">בחירת סיסמה חדשה</a> : null}
    <Link href="/login" className={localResetUrl ? "button button-outline" : "button button-primary"}>חזרה לכניסה</Link>
  </div>;

  return <form className="auth-form" method="post" action="/api/forms/noscript" onSubmit={submit}>
    <label>כתובת דוא״ל<input name="email" type="email" required maxLength={160} autoComplete="email" inputMode="email" dir="ltr" autoFocus /></label>
    {error ? <div className="auth-error" role="alert">{error}</div> : null}
    <button className="button button-primary auth-submit" disabled={sending}>{sending ? "שולחים…" : "שליחת קישור לאיפוס"}</button>
    <p className="auth-switch"><Link href="/login">חזרה לכניסה לחשבון</Link></p>
  </form>;
}
