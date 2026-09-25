"use client";
import PasswordMeter from "@/app/password-meter";

import { FormEvent, useState } from "react";
import { isPaidPlan, type PlanType } from "@/lib/plans";
import PaywallOverlay from "@/app/paywall/paywall-overlay";

type Notice = { text: string; error?: boolean; href?: string; hrefLabel?: string } | null;

export default function AccountClient({
  email,
  initialName,
  emailVerified,
  plan,
  isAdmin,
  createdLabel,
  lastSeenLabel,
  sessionCount,
  projectCount,
  pageLimit,
  bonusPages,
  referralUrl,
  planName,
  hasActiveSubscription = false,
}: {
  email: string;
  initialName: string;
  emailVerified: boolean;
  plan: PlanType;
  isAdmin: boolean;
  createdLabel: string;
  lastSeenLabel: string;
  sessionCount: number;
  projectCount: number;
  pageLimit: number;
  bonusPages: number;
  referralUrl: string;
  planName: string;
  hasActiveSubscription?: boolean;
}) {
  const [newPasswordDraft, setNewPasswordDraft] = useState("");
  const [displayName, setDisplayName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [sessionNotice, setSessionNotice] = useState<Notice>(null);
  const [deleteNotice, setDeleteNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState("");
  const [sessionsLeft, setSessionsLeft] = useState(sessionCount);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  async function copyReferral() {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedReferral(true);
      window.setTimeout(() => setCopiedReferral(false), 2200);
    } catch {
      setCopiedReferral(false);
    }
  }

  async function patchAccount(body: Record<string, unknown>) {
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("profile");
    setProfileNotice(null);
    try {
      const { ok, data } = await patchAccount({ action: "profile", displayName });
      if (!ok) {
        setProfileNotice({ text: data.error || "לא הצלחנו לעדכן את הפרטים.", error: true });
        return;
      }
      setDisplayName(data.displayName || displayName.trim());
      setSavedName(data.displayName || displayName.trim());
      setProfileNotice({ text: "השם נשמר." });
    } catch {
      setProfileNotice({ text: "לא הצלחנו להתחבר. בדקו את החיבור ונסו שוב.", error: true });
    } finally {
      setBusy("");
    }
  }

  async function requestPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("password");
    setPasswordNotice(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get("newPassword") !== data.get("confirmation")) {
      setBusy("");
      setPasswordNotice({ text: "הסיסמאות החדשות אינן תואמות.", error: true });
      return;
    }
    try {
      const { ok, data: payload } = await patchAccount({
        action: "password",
        currentPassword: data.get("currentPassword"),
        newPassword: data.get("newPassword"),
      });
      if (!ok) {
        setPasswordNotice({ text: payload.error || "לא הצלחנו לשלוח את אישור שינוי הסיסמה.", error: true });
        return;
      }
      form.reset();
      setPasswordNotice({
        text: payload.message || "שלחנו קישור אישור לכתובת הדוא״ל.",
        href: typeof payload.localConfirmUrl === "string" ? payload.localConfirmUrl : undefined,
        hrefLabel: "אישור שינוי הסיסמה עכשיו",
      });
    } catch {
      setPasswordNotice({ text: "לא הצלחנו להתחבר. בדקו את החיבור ונסו שוב.", error: true });
    } finally {
      setBusy("");
    }
  }

  async function revokeSessions() {
    setBusy("sessions");
    setSessionNotice(null);
    try {
      const { ok, data } = await patchAccount({ action: "revoke_sessions" });
      if (!ok) {
        setSessionNotice({ text: data.error || "לא הצלחנו לנתק את המכשירים האחרים.", error: true });
        return;
      }
      setSessionsLeft(1);
      setSessionNotice({ text: data.message || "המכשיר הזה נשאר מחובר." });
    } catch {
      setSessionNotice({ text: "לא הצלחנו להתחבר. נסו שוב בעוד רגע.", error: true });
    } finally {
      setBusy("");
    }
  }

  async function requestAccountDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("delete");
    setDeleteNotice(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const { ok, data: payload } = await patchAccount({
        action: "delete_request",
        confirmation: data.get("confirmation"),
        currentPassword: data.get("currentPassword"),
      });
      if (!ok) {
        setDeleteNotice({ text: payload.error || "לא הצלחנו לשלוח את אישור המחיקה.", error: true });
        return;
      }
      form.reset();
      setDeleteNotice({
        text: payload.message || "שלחנו קישור אישור לכתובת הדוא״ל.",
        href: typeof payload.localConfirmUrl === "string" ? payload.localConfirmUrl : undefined,
        hrefLabel: "המשך למחיקת החשבון",
      });
    } catch {
      setDeleteNotice({ text: "לא הצלחנו להתחבר. בדקו את החיבור ונסו שוב.", error: true });
    } finally {
      setBusy("");
    }
  }

  const profileChanged = displayName.trim() !== savedName && displayName.trim().length >= 2;

  return (
    <div className="account-grid">
      <section className="account-card account-profile-card">
        <div className="account-card-heading">
          <span>פרופיל</span>
          <h2>הפרטים שלך</h2>
          <p>השם מופיע באזור האישי. כתובת הדוא״ל משמשת לכניסה, לשחזור ולאישור פעולות רגישות.</p>
        </div>
        <form className="account-form" method="post" action="/api/forms/noscript" onSubmit={updateProfile}>
          <label>
            שם תצוגה
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={2}
              maxLength={80}
              autoComplete="name"
              required
            />
          </label>
          <label>
            כתובת דוא״ל
            <div className="account-email-field">
              <input value={email} readOnly dir="ltr" aria-describedby="email-note" />
              <span className={emailVerified ? "is-verified" : "is-pending"} aria-label={emailVerified ? "כתובת מאומתת" : "כתובת ממתינה לאימות"}>
                {emailVerified ? "מאומתת" : "ממתינה"}
              </span>
            </div>
          </label>
          <small id="email-note">לא משנים כתובת מכאן. היא המפתח לחשבון ולכל האישורים שנשלחים אליו.</small>
          {profileNotice ? <NoticeBanner notice={profileNotice} /> : null}
          <div className="account-form-actions">
            <button className="button button-primary" disabled={busy === "profile" || !profileChanged}>
              {busy === "profile" ? "שומרים…" : "שמירת השם"}
            </button>
            {profileChanged ? <span>יש שינוי שעדיין לא נשמר</span> : null}
          </div>
        </form>

        <div className="account-profile-security">
          <div className="account-card-heading">
            <span>אבטחה</span>
            <h2>שינוי סיסמה</h2>
            <p>אחרי מילוי הטופס יישלח קישור לאישור בכתובת הדוא״ל. הסיסמה משתנה רק אחרי הלחיצה שם, ואז צריך להתחבר מחדש בכל המכשירים.</p>
          </div>
          <form className="account-form password-change-grid" method="post" action="/api/forms/noscript" onSubmit={requestPasswordChange}>
            <label>הסיסמה הנוכחית<input name="currentPassword" type="password" required maxLength={128} autoComplete="current-password" dir="ltr" /></label>
            <label>סיסמה חדשה<input value={newPasswordDraft} onChange={(event) => setNewPasswordDraft(event.target.value)} name="newPassword" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" /></label>
            <PasswordMeter value={newPasswordDraft}/>
            <label>אימות הסיסמה החדשה<input name="confirmation" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" /></label>
            <p className="password-help"><span aria-hidden="true">i</span> לפחות 15 תווים. משפט שקל לזכור וקשה לאחרים לנחש הוא בחירה טובה.</p>
            {passwordNotice ? <NoticeBanner notice={passwordNotice} /> : null}
            <button className="button button-dark" disabled={busy === "password"}>
              {busy === "password" ? "שולחים אישור…" : "שליחת אישור למייל"}
            </button>
          </form>
        </div>
      </section>

      <aside className="account-side-stack">
        <section className={`account-card account-status-card ${plan}`}>
          <div className="account-card-icon" aria-hidden="true">{isPaidPlan(plan) ? "✦" : "1"}</div>
          <div>
            <span>המסלול הנוכחי</span>
            <h2>Linkli {planName}</h2>
            <p>{isPaidPlan(plan) ? `עד ${pageLimit} עמודים במכסה${bonusPages ? `, כולל ${bonusPages} מעמודי הפניה` : ""}, בלי מיתוג.` : "עמוד מפורסם אחד · טיוטות ללא הגבלה"}</p>
          </div>
          <ul className="account-meta-list">
            {createdLabel ? <li><b>נרשמת</b><span>{createdLabel}</span></li> : null}
            {lastSeenLabel ? <li><b>פעילות אחרונה</b><span>{lastSeenLabel}</span></li> : null}
            <li><b>עמודים בחשבון</b><span>{projectCount}</span></li>
            <li><b>מכסת עמודים</b><span>{pageLimit}{bonusPages ? ` · כולל ${bonusPages} מתנה` : ""}</span></li>
          </ul>
          <button type="button" className="button button-outline button-small" onClick={() => setPaywallOpen(true)}>
            {isPaidPlan(plan) ? "לכל המסלולים" : "לצפייה במסלולים"}
          </button>
        </section>

        <section className="account-card account-referral-card">
          <div className="account-card-heading">
            <span>הפניות</span>
            <h2>עמוד Pro מתנה</h2>
            <p>כשמישהו נרשם דרך הקישור שלך ורוכש Pro ומעלה, מתווסף אצלך אוטומטית עמוד נוסף למכסה.</p>
          </div>
          {referralUrl ? (
            <>
              <code className="account-referral-link" dir="ltr">{referralUrl}</code>
              <button type="button" className="button button-outline button-small" onClick={copyReferral}>{copiedReferral ? "הועתק" : "העתקת הקישור"}</button>
            </>
          ) : <p>קוד ההפניה יופיע כאן אחרי רענון קצר.</p>}
        </section>

        <section className="account-card account-sessions-card">
          <div className="account-card-heading">
            <span>מכשירים</span>
            <h2>התנתקות מרחוק</h2>
            <p>אם נותר חיבור פתוח במחשב ציבורי או בטלפון ישן, אפשר לנתק מכאן את שאר המכשירים.</p>
          </div>
          <div className="account-sessions-row">
            <div className="account-sessions-stat">
              <strong>{sessionsLeft}</strong>
              <b>{sessionsLeft === 1 ? "מכשיר מחובר" : "מכשירים מחוברים"}</b>
              <small>המכשיר הזה יישאר מחובר</small>
            </div>
            <button className="button button-outline" type="button" onClick={revokeSessions} disabled={busy === "sessions" || sessionsLeft <= 1}>
              {busy === "sessions" ? "מנתקים…" : "ניתוק כל המכשירים האחרים"}
            </button>
          </div>
          {sessionNotice ? <NoticeBanner notice={sessionNotice} /> : null}
        </section>
      </aside>

      {isAdmin ? (
        <section className="account-card account-card-wide account-danger-card is-locked">
          <div className="account-card-heading">
            <span>אזור מסוכן</span>
            <h2>מחיקת החשבון</h2>
            <p>חשבון מנהל לא נמחק מכאן, כדי לא לנעול את הגישה לניהול האתר.</p>
          </div>
        </section>
      ) : (
        <section className="account-card account-card-wide account-danger-card">
          <div className="account-card-heading">
            <span>אזור מסוכן</span>
            <h2>מחיקת החשבון</h2>
            <p>
              {hasActiveSubscription
                ? "מנוי מתחדש פעיל חוסם מחיקה. קודם מבטלים את המנוי בפורטל החיוב, ורק אחרי שהביטול נקלט אפשר למחוק את החשבון."
                : "הפעולה סופית. יימחקו החשבון, כל העמודים והקישורים הציבוריים — ואי אפשר לבטל אחרי שהמחיקה מתבצעת."}
            </p>
          </div>
          {hasActiveSubscription ? (
            <div className="account-danger-list">
              <p>המחיקה לא מבטלת חיוב אצל ספק הסליקה. צריך לבטל שם, ואז לחזור לכאן.</p>
              <a className="button button-outline" href="/checkout">לניהול המנוי</a>
            </div>
          ) : (
          <>
          <ul className="account-danger-list">
            <li>כל העמודים שנוצרו בחשבון יימחקו</li>
            <li>קישורים שכבר נשלחו יפסיקו לעבוד</li>
            <li>המחיקה דורשת סיסמה וגם אישור בקישור שיגיע לדוא״ל</li>
          </ul>
          <form className="account-form account-danger-form" method="post" action="/api/forms/noscript" onSubmit={requestAccountDeletion}>
            <label>
              הקלידו את כתובת הדוא״ל לאישור
              <input name="confirmation" type="email" required dir="ltr" autoComplete="email" placeholder={email} />
            </label>
            <label>
              הסיסמה הנוכחית
              <input name="currentPassword" type="password" required maxLength={128} autoComplete="current-password" dir="ltr" />
            </label>
            <label className="account-danger-check">
              <input name="irreversible" type="checkbox" required />
              <span>ברור לי שאי אפשר לבטל את המחיקה ברגע שהחשבון נמחק</span>
            </label>
            {deleteNotice ? <NoticeBanner notice={deleteNotice} /> : null}
            <button className="button button-danger-solid" disabled={busy === "delete"}>
              {busy === "delete" ? "שולחים אישור…" : "שליחת קישור למחיקת החשבון"}
            </button>
          </form>
          </>
          )}
        </section>
      )}
      <PaywallOverlay open={paywallOpen} onClose={() => setPaywallOpen(false)} currentPlan={plan} email={email} feature="browse" />
    </div>
  );
}

function NoticeBanner({ notice }: { notice: NonNullable<Notice> }) {
  return (
    <div className={`status-message ${notice.error ? "error" : ""}`} role="status">
      <p>{notice.text}</p>
      {notice.href ? <a href={notice.href}>{notice.hrefLabel || "המשך"}</a> : null}
    </div>
  );
}

