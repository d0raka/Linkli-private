"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordForm() {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setMessage(""); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/password/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: data.get("email") }),
    });
    const payload = await response.json();
    setSending(false);
    if (!response.ok) return setError(payload.error || "לא הצלחנו לשלוח את הבקשה. נסו שוב בעוד כמה דקות.");
    setMessage(payload.message);
  }

  if (message) return <div className="auth-complete"><div className="auth-complete-icon">✉️</div><h2>כדאי לבדוק את תיבת הדוא״ל</h2><p>{message}</p><Link href="/login" className="button button-primary">חזרה לכניסה</Link></div>;

  return <form className="auth-form" onSubmit={submit}>
    <label>כתובת דוא״ל<input name="email" type="email" required maxLength={160} autoComplete="email" inputMode="email" dir="ltr" autoFocus /></label>
    {error ? <div className="auth-error" role="alert">{error}</div> : null}
    <button className="button button-primary auth-submit" disabled={sending}>{sending ? "שולחים…" : "שליחת קישור לאיפוס"}</button>
    <p className="auth-switch"><Link href="/login">חזרה לכניסה לחשבון</Link></p>
  </form>;
}
