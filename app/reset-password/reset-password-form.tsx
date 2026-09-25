"use client";

import Link from "next/link";
import PasswordMeter from "@/app/password-meter";
import { FormEvent, useState } from "react";
import { apiFetch, errorMessage, safeRelativePath } from "@/lib/api-client";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setError("");
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmation")) {
      setSending(false); setError("הסיסמאות אינן תואמות."); return;
    }
    try {
      const payload = await apiFetch<{ redirectTo?: string }>("/api/auth/password/reset", { method: "POST", json: { token, password: data.get("password") } });
      window.location.assign(safeRelativePath(payload.redirectTo, "/studio"));
    } catch (caught) {
      setError(errorMessage(caught, "לא הצלחנו לעדכן את הסיסמה."));
      setSending(false);
    }
  }

  if (!token) return <div className="auth-complete"><div className="auth-complete-icon">🔒</div><h2>קישור לא תקין</h2><p>הקישור חסר או אינו בפורמט הנכון. אפשר לבקש קישור חדש.</p><Link href="/forgot-password" className="button button-primary">בקשת קישור חדש</Link></div>;

  return <form className="auth-form" method="post" action="/api/forms/noscript" onSubmit={submit}>
    <label>סיסמה חדשה<input value={password} onChange={(event) => setPassword(event.target.value)} name="password" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" autoFocus /></label>
    <label>אימות הסיסמה החדשה<input name="confirmation" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" /></label>
    <PasswordMeter value={password}/>
    <p className="password-help">לפחות 15 תווים. מומלץ לבחור משפט שקל לזכור וקשה לנחש.</p>
    {error ? <div className="auth-error" role="alert">{error}</div> : null}
    <button className="button button-primary auth-submit" disabled={sending}>{sending ? "מעדכנים…" : "עדכון הסיסמה"}</button>
  </form>;
}
