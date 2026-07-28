"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { CampaignAttribution } from "@/lib/marketing";
import { withCampaign } from "@/lib/marketing";

export default function AuthForm({ mode, returnTo, campaign }: { mode: "login" | "register"; returnTo: string; campaign?: CampaignAttribution }) {
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const alternateHref = withCampaign(`${mode === "login" ? "/register" : "/login"}?returnTo=${encodeURIComponent(returnTo)}`, campaign || { source: "", medium: "", campaign: "", content: "", term: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form.entries());
    payload.acceptTerms = form.get("acceptTerms") === "on";
    payload.returnTo = returnTo;
    if (campaign) Object.assign(payload, campaign);
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

  async function quickDemoLogin() {
    setSending(true); setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "dor.aka.inbox@gmail.com", password: "Pass123456!", returnTo }),
    });
    const data = await response.json();
    setSending(false);
    if (!response.ok) return setError(data.error || "לא הצלחנו להשלים את התחברות הדמו");
    window.location.assign(data.redirectTo || "/studio");
  }

  return <form className="auth-form" onSubmit={submit}>
    {mode === "register" && <label>שם מלא<input name="displayName" required minLength={2} maxLength={80} autoComplete="name" /></label>}
    <label>{mode === "login" ? "דוא״ל או שם משתמש" : "כתובת דוא״ל"}<input name="email" type={mode === "login" ? "text" : "email"} required maxLength={160} autoComplete="username" inputMode={mode === "login" ? "text" : "email"} dir="ltr" defaultValue={mode === "login" ? "dor.aka.inbox@gmail.com" : ""} /></label>
    <label>סיסמה<input name="password" type="password" required minLength={mode === "register" ? 15 : undefined} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} dir="ltr" defaultValue={mode === "login" ? "Pass123456!" : ""} /></label>
    {mode === "register" && <>
      <p className="password-help">לפחות 15 תווים. מומלץ לבחור משפט שקל לכם לזכור וקשה לאחרים לנחש.</p>
      <label className="auth-honeypot" aria-hidden="true">חברה<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <label className="auth-consent"><input name="acceptTerms" type="checkbox" required /><span>קראתי ואני מאשר/ת את <Link href="/legal#terms">תנאי השימוש</Link> ואת <Link href="/legal#privacy">מדיניות הפרטיות</Link>.</span></label>
    </>}
    {mode === "login" && <div className="auth-recovery-link"><Link href="/forgot-password">שכחת את הסיסמה?</Link></div>}
    {error && <div className="auth-error" role="alert">{error}</div>}
    <button className="button button-primary auth-submit" disabled={sending}>{sending ? "רגע…" : mode === "login" ? "כניסה לחשבון" : "פתיחת חשבון בחינם"}</button>
    {mode === "login" && <button type="button" onClick={quickDemoLogin} className="button button-outline" disabled={sending} style={{ width: "100%", marginTop: "10px", borderColor: "#db2777", color: "#be185d", fontWeight: 800 }}>🚀 התחברות מהירה בלחיצה אחת (דמו)</button>}
    <p className="auth-switch">{mode === "login" ? "עדיין אין לכם חשבון?" : "כבר יש לכם חשבון?"} <Link href={alternateHref}>{mode === "login" ? "פתיחת חשבון בחינם" : "כניסה לחשבון"}</Link></p>
  </form>;
}
