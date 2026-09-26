"use client";

import { FormEvent, useId, useState } from "react";
import { DeviceMobile } from "@phosphor-icons/react/ssr";
import PasswordMeter from "@/app/password-meter";
import { Button } from "@/app/ui/button";
import { Badge, Notice } from "@/app/ui/status";

type Result = { text: string; error?: boolean; href?: string; hrefLabel?: string } | null;

async function patchAccount(body: Record<string, unknown>) {
  try {
    const response = await fetch("/api/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: { error: "לא הצלחנו להתחבר. בדקו את החיבור ונסו שוב." } };
  }
}

function ResultNotice({ result }: { result: Result }) {
  if (!result) return null;
  return (
    <Notice tone={result.error ? "danger" : "success"}>
      {result.text}
      {result.href ? <> <a href={result.href}>{result.hrefLabel || "המשך"}</a></> : null}
    </Notice>
  );
}

export function ProfileSection({ email, initialName, emailVerified }: { email: string; initialName: string; emailVerified: boolean }) {
  const id = useId();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const changed = name.trim() !== saved && name.trim().length >= 2;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    const { ok, data } = await patchAccount({ action: "profile", displayName: name });
    setBusy(false);
    if (!ok) { setResult({ text: data.error || "לא הצלחנו לעדכן את השם.", error: true }); return; }
    const next = data.displayName || name.trim();
    setName(next);
    setSaved(next);
    setResult({ text: "השם נשמר." });
  }

  return (
    <section className="ui-panel account-section" id="profile" aria-labelledby="profile-title">
      <form className="ui-panel__section account-form" method="post" action="/api/forms/noscript" onSubmit={submit}>
        <div className="account-section__head">
          <div>
            <h2 className="ui-section-title" id="profile-title">פרופיל</h2>
            <p className="ui-section-lead">השם מופיע בחשבון שלכם בלבד. לא מציגים אותו לאורחים.</p>
          </div>
        </div>
        <div className="account-grid">
          <div className="ui-field">
            <label className="ui-label" htmlFor={`${id}-name`}>שם</label>
            <input id={`${id}-name`} className="ui-input" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} autoComplete="name" required />
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor={`${id}-email`}>דוא״ל</label>
            <input id={`${id}-email`} className="ui-input" value={email} readOnly dir="ltr" aria-describedby={`${id}-email-hint`} />
            <p className="ui-hint account-email-hint" id={`${id}-email-hint`}>
              <Badge tone={emailVerified ? "success" : "warning"}>{emailVerified ? "מאומת" : "ממתין לאימות"}</Badge>
              הכתובת משמשת לכניסה ולאישור פעולות רגישות.
            </p>
          </div>
        </div>
        <ResultNotice result={result} />
        <div className="account-actions">
          <Button type="submit" variant="primary" disabled={!changed} loading={busy} loadingLabel="שומרים…">שמירת השם</Button>
        </div>
      </form>
    </section>
  );
}

export function PasswordSection() {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get("newPassword") !== data.get("confirmation")) {
      setResult({ text: "הסיסמאות החדשות לא זהות.", error: true });
      return;
    }
    setBusy(true);
    const { ok, data: payload } = await patchAccount({ action: "password", currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") });
    setBusy(false);
    if (!ok) { setResult({ text: payload.error || "לא הצלחנו לשלוח את אישור שינוי הסיסמה.", error: true }); return; }
    form.reset();
    setDraft("");
    setResult({
      text: payload.message || "שלחנו קישור אישור לדוא״ל. הסיסמה תשתנה אחרי הלחיצה עליו.",
      href: typeof payload.localConfirmUrl === "string" ? payload.localConfirmUrl : undefined,
      hrefLabel: "אישור עכשיו",
    });
  }

  return (
    <section className="ui-panel account-section" id="security" aria-labelledby="security-title">
      <form className="ui-panel__section account-form" method="post" action="/api/forms/noscript" onSubmit={submit}>
        <div className="account-section__head">
          <div>
            <h2 className="ui-section-title" id="security-title">שינוי סיסמה</h2>
            <p className="ui-section-lead">נשלח קישור אישור לדוא״ל. הסיסמה משתנה רק אחרי האישור, ואז צריך להיכנס מחדש בכל המכשירים.</p>
          </div>
        </div>
        <div className="account-grid">
          <div className="ui-field is-wide">
            <label className="ui-label" htmlFor={`${id}-current`}>הסיסמה הנוכחית</label>
            <input id={`${id}-current`} className="ui-input" name="currentPassword" type="password" required maxLength={128} autoComplete="current-password" dir="ltr" />
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor={`${id}-new`}>סיסמה חדשה</label>
            <input id={`${id}-new`} className="ui-input" value={draft} onChange={(event) => setDraft(event.target.value)} name="newPassword" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" />
            <PasswordMeter value={draft} />
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor={`${id}-confirm`}>הסיסמה החדשה שוב</label>
            <input id={`${id}-confirm`} className="ui-input" name="confirmation" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" />
          </div>
        </div>
        <ResultNotice result={result} />
        <div className="account-actions">
          <Button type="submit" variant="inverse" loading={busy} loadingLabel="שולחים…">שליחת אישור לדוא״ל</Button>
        </div>
      </form>
    </section>
  );
}

export function SessionsSection({ sessionCount }: { sessionCount: number }) {
  const [left, setLeft] = useState(sessionCount);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  async function revoke() {
    setBusy(true);
    setResult(null);
    const { ok, data } = await patchAccount({ action: "revoke_sessions" });
    setBusy(false);
    if (!ok) { setResult({ text: data.error || "לא הצלחנו לנתק את המכשירים האחרים.", error: true }); return; }
    setLeft(1);
    setResult({ text: data.message || "המכשירים האחרים נותקו. המכשיר הזה נשאר מחובר." });
  }

  return (
    <section className="ui-panel account-section" id="devices" aria-labelledby="devices-title">
      <div className="ui-panel__section">
        <div className="account-section__head">
          <div>
            <h2 className="ui-section-title" id="devices-title">מכשירים מחוברים</h2>
            <p className="ui-section-lead">שכחתם חיבור פתוח במחשב ציבורי או בטלפון ישן? אפשר לנתק אותו מכאן.</p>
          </div>
        </div>
        <div className="account-devices">
          <DeviceMobile aria-hidden="true" weight="duotone" />
          <p><b>{left === 1 ? "מכשיר אחד מחובר" : `${left} מכשירים מחוברים`}</b><span>כולל המכשיר הזה</span></p>
          <Button onClick={revoke} disabled={left <= 1} loading={busy} loadingLabel="מנתקים…">ניתוק שאר המכשירים</Button>
        </div>
        <ResultNotice result={result} />
      </div>
    </section>
  );
}

export function DeleteAccountSection({ email, isAdmin, hasActiveSubscription }: { email: string; isAdmin: boolean; hasActiveSubscription: boolean }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const { ok, data: payload } = await patchAccount({ action: "delete_request", confirmation: data.get("confirmation"), currentPassword: data.get("currentPassword") });
    setBusy(false);
    if (!ok) { setResult({ text: payload.error || "לא הצלחנו לשלוח את אישור המחיקה.", error: true }); return; }
    form.reset();
    setResult({
      text: payload.message || "שלחנו קישור אישור לדוא״ל. החשבון יימחק רק אחרי הלחיצה עליו.",
      href: typeof payload.localConfirmUrl === "string" ? payload.localConfirmUrl : undefined,
      hrefLabel: "המשך למחיקה",
    });
  }

  return (
    <section className="ui-panel account-section account-danger" id="delete" aria-labelledby="delete-title">
      <div className="ui-panel__section">
        <div className="account-section__head">
          <div>
            <h2 className="ui-section-title" id="delete-title">מחיקת החשבון</h2>
            <p className="ui-section-lead">
              {isAdmin
                ? "חשבון מנהל לא נמחק מכאן, כדי לא לנעול את הגישה לניהול האתר."
                : hasActiveSubscription
                  ? "יש מנוי מתחדש פעיל. קודם מבטלים אותו אצל ספק התשלום, ואז אפשר למחוק את החשבון."
                  : "כל העמודים, התמונות ואישורי ההגעה יימחקו, וקישורים שכבר נשלחו יפסיקו לעבוד. אי אפשר לשחזר."}
            </p>
          </div>
        </div>
        {isAdmin ? null : hasActiveSubscription ? (
          <div className="account-actions"><a className="ui-button" href="/contact?topic=billing">עזרה בביטול המנוי</a></div>
        ) : (
          <form className="account-form" method="post" action="/api/forms/noscript" onSubmit={submit}>
            <div className="account-grid">
              <div className="ui-field">
                <label className="ui-label" htmlFor={`${id}-confirmation`}>הקלידו את כתובת הדוא״ל לאישור</label>
                <input id={`${id}-confirmation`} className="ui-input" name="confirmation" type="email" required dir="ltr" autoComplete="off" placeholder={email} />
              </div>
              <div className="ui-field">
                <label className="ui-label" htmlFor={`${id}-password`}>הסיסמה הנוכחית</label>
                <input id={`${id}-password`} className="ui-input" name="currentPassword" type="password" required maxLength={128} autoComplete="current-password" dir="ltr" />
              </div>
            </div>
            <label className="ui-check"><input name="irreversible" type="checkbox" required /><span>ברור לי שאי אפשר לבטל את המחיקה.</span></label>
            <ResultNotice result={result} />
            <div className="account-actions">
              <Button type="submit" variant="danger" loading={busy} loadingLabel="שולחים…">שליחת קישור למחיקה</Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
