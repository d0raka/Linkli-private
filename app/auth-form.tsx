"use client";

import Link from "next/link";
import PasswordMeter from "./password-meter";
import { FormEvent, useId, useState, useSyncExternalStore } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react/ssr";
import type { CampaignAttribution } from "@/lib/marketing";
import { withCampaign } from "@/lib/marketing";
import { REFERRAL_COOKIE, sanitizeReferralCode } from "@/lib/referrals";
import { apiFetch, errorMessage, safeRelativePath } from "@/lib/api-client";
import { Button } from "@/app/ui/button";
import { Notice } from "@/app/ui/status";

const subscribeToNothing = () => () => {};

function PasswordField({ id, name, autoComplete, minLength }: { id: string; name: string; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  return (
    <>
      <span className="ui-input-group">
        <input id={id} className="ui-input" value={value} onChange={(event) => setValue(event.target.value)} name={name} type={visible ? "text" : "password"} required minLength={minLength} maxLength={128} autoComplete={autoComplete} dir="ltr" aria-describedby={"password-help"} />
        <button type="button" className="ui-input-group__action" aria-label={visible ? "הסתרת סיסמה" : "הצגת סיסמה"} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
          {visible ? <EyeSlash aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {visible ? "הסתרה" : "הצגה"}
        </button>
      </span>
      {minLength ? <PasswordMeter value={value} /> : null}
    </>
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
  const id = useId();
  const browserReferral = useSyncExternalStore(subscribeToNothing, readBrowserReferral, () => "");
  const capturedReferral = referralCode || browserReferral;
  const alternateHref = withCampaign(`${mode === "login" ? "/register" : "/login"}?returnTo=${encodeURIComponent(returnTo)}`, campaign || { source: "", medium: "", campaign: "", content: "", term: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form.entries());
    payload.acceptTerms = form.get("acceptTerms") === "on";
    payload.returnTo = returnTo;
    if (campaign) Object.assign(payload, campaign);
    if (capturedReferral) payload.referralCode = capturedReferral;
    try {
      const data = await apiFetch<{ redirectTo?: string }>(`/api/auth/${mode}`, { method: "POST", json: payload });
      window.location.assign(safeRelativePath(data.redirectTo, "/studio"));
    } catch (caught) {
      setError(errorMessage(caught, "לא הצלחנו להשלים את הפעולה"));
      setSending(false);
    }
  }

  return (
    <form className="auth-form" method="post" action="/api/forms/noscript" onSubmit={submit}>
      {mode === "register" ? (
        <div className="ui-field">
          <label className="ui-label" htmlFor={`${id}-name`}>שם מלא</label>
          <input id={`${id}-name`} className="ui-input" name="displayName" required minLength={2} maxLength={80} autoComplete="name" />
        </div>
      ) : null}
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-email`}>{mode === "login" ? "דוא״ל או שם משתמש" : "כתובת דוא״ל"}</label>
        <input id={`${id}-email`} className="ui-input" name="email" type={mode === "login" ? "text" : "email"} required maxLength={160} autoComplete="username" inputMode={mode === "login" ? "text" : "email"} dir="ltr" />
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-password`}>סיסמה</label>
        <PasswordField id={`${id}-password`} name="password" minLength={mode === "register" ? 15 : undefined} autoComplete={mode === "register" ? "new-password" : "current-password"} />
        {mode === "register"
          ? <p className="ui-hint" id="password-help">לפחות 15 תווים. משפט קצר שקל לכם לזכור וקשה לאחרים לנחש עובד הכי טוב.</p>
          : <p className="sr-only" id="password-help">סיסמת החשבון</p>}
      </div>
      {mode === "login" ? <div className="auth-form__row"><Link href="/forgot-password">שכחתם את הסיסמה?</Link></div> : null}
      {mode === "register" ? (
        <>
          {capturedReferral ? <input type="hidden" name="referralCode" value={capturedReferral} /> : null}
          <label className="auth-honeypot" aria-hidden="true">חברה<input name="company" tabIndex={-1} autoComplete="off" /></label>
          <label className="ui-check">
            <input name="acceptTerms" type="checkbox" required />
            <span>קראתי ואני מסכים/ה ל<Link href="/legal#terms">תנאי השימוש</Link> ול<Link href="/legal#privacy">מדיניות הפרטיות</Link>.</span>
          </label>
        </>
      ) : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="submit" variant="primary" size="lg" block loading={sending} loadingLabel="רגע…">
        {mode === "login" ? "כניסה" : "פתיחת חשבון בחינם"}
      </Button>
      <p className="auth-form__switch">
        {mode === "login" ? "עוד אין לכם חשבון?" : "כבר יש לכם חשבון?"} <Link href={alternateHref} className="ui-link">{mode === "login" ? "פתיחת חשבון בחינם" : "כניסה"}</Link>
      </p>
    </form>
  );
}
