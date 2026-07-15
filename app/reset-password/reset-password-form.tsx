"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setError("");
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmation")) {
      setSending(false); setError("הסיסמאות אינן תואמות."); return;
    }
    const response = await fetch("/api/auth/password/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: data.get("password") }),
    });
    const payload = await response.json();
    setSending(false);
    if (!response.ok) return setError(payload.error || "לא הצלחנו לעדכן את הסיסמה.");
    window.location.assign(payload.redirectTo || "/studio");
  }

  if (!token) return <div className="auth-complete"><div className="auth-complete-icon">🔒</div><h2>קישור לא תקין</h2><p>הקישור חסר או אינו בפורמט הנכון. אפשר לבקש קישור חדש.</p><Link href="/forgot-password" className="button button-primary">בקשת קישור חדש</Link></div>;

  return <form className="auth-form" onSubmit={submit}>
    <label>סיסמה חדשה<input name="password" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" autoFocus /></label>
    <label>אימות הסיסמה החדשה<input name="confirmation" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" /></label>
    <p className="password-help">לפחות 15 תווים. מומלץ לבחור משפט שקל לזכור וקשה לנחש.</p>
    {error ? <div className="auth-error" role="alert">{error}</div> : null}
    <button className="button button-primary auth-submit" disabled={sending}>{sending ? "מעדכנים…" : "עדכון הסיסמה"}</button>
  </form>;
}
