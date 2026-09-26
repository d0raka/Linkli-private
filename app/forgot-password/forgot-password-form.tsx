"use client";

import Link from "next/link";
import { FormEvent, useId, useState } from "react";
import { EnvelopeSimple, LockKeyOpen } from "@phosphor-icons/react/ssr";
import { apiFetch, errorMessage, safeRelativePath } from "@/lib/api-client";
import { Button } from "@/app/ui/button";
import { Notice } from "@/app/ui/status";

export default function ForgotPasswordForm() {
  const id = useId();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [localResetUrl, setLocalResetUrl] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const payload = await apiFetch<{ message?: string; localResetUrl?: string }>("/api/auth/password/forgot", { method: "POST", json: { email: data.get("email") } });
      if (payload.localResetUrl) {
        const url = new URL(payload.localResetUrl, window.location.origin);
        setLocalResetUrl(safeRelativePath(url.pathname + url.search, ""));
      }
      setMessage(payload.message || "אם קיים חשבון עם הכתובת שהזנתם, נשלחה אליו הודעה עם קישור לאיפוס הסיסמה.");
    } catch (caught) {
      setError(errorMessage(caught, "לא הצלחנו לשלוח את הבקשה. נסו שוב בעוד כמה דקות."));
    } finally {
      setSending(false);
    }
  }

  if (message) {
    return (
      <div className="auth-complete" role="status">
        <span className="auth-complete__icon" aria-hidden="true">{localResetUrl ? <LockKeyOpen /> : <EnvelopeSimple />}</span>
        <h2>{localResetUrl ? "קישור האיפוס המקומי מוכן" : "בדקו את תיבת הדוא״ל"}</h2>
        <p>{localResetUrl ? "שליחת דוא״ל לא מוגדרת בסביבת הפיתוח, אז אפשר להמשיך מכאן." : message}</p>
        <div className="auth-complete__actions">
          {localResetUrl ? <a href={localResetUrl} className="ui-button" data-variant="primary">בחירת סיסמה חדשה</a> : null}
          <Link href="/login" className="ui-button" data-variant={localResetUrl ? undefined : "primary"}>חזרה לכניסה</Link>
        </div>
      </div>
    );
  }

  return (
    <form className="auth-form" method="post" action="/api/forms/noscript" onSubmit={submit}>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-email`}>כתובת דוא״ל</label>
        <input id={`${id}-email`} className="ui-input" name="email" type="email" required maxLength={160} autoComplete="email" inputMode="email" dir="ltr" autoFocus />
      </div>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="submit" variant="primary" size="lg" block loading={sending} loadingLabel="שולחים…">שליחת קישור לאיפוס</Button>
    </form>
  );
}
