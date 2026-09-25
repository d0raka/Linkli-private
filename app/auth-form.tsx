"use client";

import Link from "next/link";
import PasswordMeter from "./password-meter";
import { FormEvent, useState, useSyncExternalStore } from "react";
import type { CampaignAttribution } from "@/lib/marketing";
import { withCampaign } from "@/lib/marketing";
import { REFERRAL_COOKIE, sanitizeReferralCode } from "@/lib/referrals";
import { apiFetch, errorMessage, safeRelativePath } from "@/lib/api-client";

const subscribeToNothing = () => () => {};

function PasswordField({
  name,
  autoComplete,
  minLength,
}: {
  name: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  return (
    <span className="password-field">
      <input value={value} onChange={(event) => setValue(event.target.value)} name={name} type={visible ? "text" : "password"} required minLength={minLength} maxLength={128} autoComplete={autoComplete} dir="ltr" aria-describedby={"password-help"} />
      <button type="button" className="password-toggle" aria-label={visible ? "הסתרת סיסמה" : "הצגת סיסמה"} onClick={() => setVisible((value) => !value)}>
        {visible ? "הסתרה" : "הצגה"}
      </button>
    {minLength && <PasswordMeter value={value}/>}
    </span>
  );
}

function readBrowserReferral() {
  const fromUrl = sanitizeReferralCode(new URLSearchParams(window.location.search).get("ref"));
  if (fromUrl) return fromUrl;
  const match = document.cookie.match(new RegExp(`(?:^|; )${REFERRAL_COOKIE}=([A-Za-z0-9]{6,12})`));
  return sanitizeReferralCode(match?.[1] || "");
}

export default function AuthForm({ mode, returnTo, campaign, referralCode = "" }: { mode: "login" | "register"; returnTo: string; campaign?: CampaignAttribution; referralCode?: string }) {
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const browserReferral = useSyncExternalStore(subscribeToNothing, readBrowserReferral, () => "");
  const capturedReferral = referralCode || browserReferral;
  const alternateHref = withCampaign(`${mode === "login" ? "/register" : "/login"}?returnTo=${encodeURIComponent(returnTo)}`, campaign || { source: "", medium: "", campaign: "", content: "", term: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form.entries());
    payload.acceptTerms = form.get("acceptTerms") === "on";
    payload.returnTo = returnTo;
    if (campaign) Object.assign(payload, campaign);
    if (capturedReferral) payload.referralCode = capturedReferral;
    try {
      const data = await apiFetch<{ redirectTo?: string }>(`/api/auth/${mode}`, { method: "POST", json: payload });
      window.location.assign(safeRelativePath(data.redirectTo, "/studio"));
    } catch (error) {
      setError(errorMessage(error, "לא הצלחנו להשלים את הפעולה"));
      setSending(false);
    }
  }

  return <form className="auth-form" method="post" action="/api/forms/noscript" onSubmit={submit}>
    {mode === "register" && <label>שם מלא<input name="displayName" required minLength={2} maxLength={80} autoComplete="name" /></label>}
    <label>{mode === "login" ? "דוא״ל או שם משתמש" : "כתובת דוא״ל"}<input name="email" type={mode === "login" ? "text" : "email"} required maxLength={160} autoComplete="username" inputMode={mode === "login" ? "text" : "email"} dir="ltr" /></label>
    <label>סיסמה<PasswordField name="password" minLength={mode === "register" ? 15 : undefined} autoComplete={mode === "register" ? "new-password" : "current-password"} /></label>
    {mode === "register" ? <p className="password-help" id="password-help">לפחות 15 תווים. מומלץ לבחור משפט שקל לך לזכור וקשה לאחרים לנחש.</p> : <p className="sr-only" id="password-help">סיסמת החשבון</p>}
    {mode === "register" && <>
      {capturedReferral ? <input type="hidden" name="referralCode" value={capturedReferral} /> : null}
      <label className="auth-honeypot" aria-hidden="true">חברה<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <label className="auth-consent"><input name="acceptTerms" type="checkbox" required /><span>קראתי ואני מאשר/ת את <Link href="/legal#terms">תנאי השימוש</Link> ואת <Link href="/legal#privacy">מדיניות הפרטיות</Link>.</span></label>
    </>}
    {mode === "login" && <div className="auth-recovery-link"><Link href="/forgot-password">שכחת את הסיסמה?</Link></div>}
    {error && <div className="auth-error" role="alert">{error}</div>}
    <button className="button button-primary auth-submit" disabled={sending}>{sending ? "רגע…" : mode === "login" ? "כניסה לחשבון" : "פתיחת חשבון בחינם"}</button>
    <p className="auth-switch">{mode === "login" ? "עדיין אין חשבון?" : "כבר יש חשבון?"} <Link href={alternateHref}>{mode === "login" ? "פתיחת חשבון בחינם" : "כניסה לחשבון"}</Link></p>
  </form>;
}
