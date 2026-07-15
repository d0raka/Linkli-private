"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function AuthForm({ mode, returnTo }: { mode: "login" | "register"; returnTo: string }) {
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const alternateHref = `${mode === "login" ? "/register" : "/login"}?returnTo=${encodeURIComponent(returnTo)}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form.entries());
    payload.acceptTerms = form.get("acceptTerms") === "on";
    payload.returnTo = returnTo;
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setSending(false);
    if (!response.ok) return setError(data.error || "לא הצלחנו להשלים את הפעולה");
    window.location.assign(data.redirectTo || "/studio");
  }

  return <form className="auth-form" onSubmit={submit}>
    {mode === "register" && <label>שם מלא<input name="displayName" required minLength={2} maxLength={80} autoComplete="name" /></label>}
    <label>{mode === "login" ? "דוא״ל או שם משתמש" : "כתובת דוא״ל"}<input name="email" type={mode === "login" ? "text" : "email"} required maxLength={160} autoComplete="username" inputMode={mode === "login" ? "text" : "email"} dir="ltr" /></label>
    <label>סיסמה<input name="password" type="password" required minLength={mode === "register" ? 15 : undefined} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} dir="ltr" /></label>
    {mode === "register" && <>
      <p className="password-help">לפחות 15 תווים. מומלץ לבחור משפט שקל לך לזכור וקשה לאחרים לנחש.</p>
      <label className="auth-honeypot" aria-hidden="true">חברה<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <label className="auth-consent"><input name="acceptTerms" type="checkbox" required /><span>קראתי ואני מאשר/ת את <Link href="/legal#terms">תנאי השימוש</Link> ואת <Link href="/legal#privacy">מדיניות הפרטיות</Link>.</span></label>
    </>}
    {mode === "login" && <div className="auth-recovery-link"><Link href="/forgot-password">שכחת את הסיסמה?</Link></div>}
    {error && <div className="auth-error" role="alert">{error}</div>}
    <button className="button button-primary auth-submit" disabled={sending}>{sending ? "רגע…" : mode === "login" ? "כניסה לחשבון" : "פתיחת חשבון בחינם"}</button>
    <p className="auth-switch">{mode === "login" ? "עדיין אין לך חשבון?" : "כבר יש לך חשבון?"} <Link href={alternateHref}>{mode === "login" ? "פתיחת חשבון בחינם" : "כניסה לחשבון"}</Link></p>
  </form>;
}
