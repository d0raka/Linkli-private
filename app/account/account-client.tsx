"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Notice = { text: string; error?: boolean } | null;

export default function AccountClient({
  email,
  initialName,
  emailVerified,
  plan,
}: {
  email: string;
  initialName: string;
  emailVerified: boolean;
  plan: "free" | "plus";
}) {
  const [displayName, setDisplayName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [verificationNotice, setVerificationNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState("");

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("profile");
    setProfileNotice(null);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "profile", displayName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setProfileNotice({ text: data.error || "לא הצלחנו לעדכן את הפרטים.", error: true });
        return;
      }
      setDisplayName(data.displayName || displayName.trim());
      setSavedName(data.displayName || displayName.trim());
      setProfileNotice({ text: "הפרטים נשמרו בהצלחה." });
    } catch {
      setProfileNotice({ text: "לא הצלחנו להתחבר. בדקו את החיבור ונסו שוב.", error: true });
    } finally {
      setBusy("");
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("password");
    setPasswordNotice(null);
    const form = new FormData(event.currentTarget);
    if (form.get("newPassword") !== form.get("confirmation")) {
      setBusy("");
      setPasswordNotice({ text: "הסיסמאות החדשות אינן תואמות.", error: true });
      return;
    }
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "password",
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPasswordNotice({ text: data.error || "לא הצלחנו לעדכן את הסיסמה.", error: true });
        return;
      }
      window.location.assign(data.redirectTo || "/login?passwordChanged=1");
    } catch {
      setPasswordNotice({ text: "לא הצלחנו להתחבר. בדקו את החיבור ונסו שוב.", error: true });
    } finally {
      setBusy("");
    }
  }

  async function resendVerification() {
    setBusy("verification");
    setVerificationNotice(null);
    try {
      const response = await fetch("/api/auth/verification/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const data = await response.json().catch(() => ({}));
      setVerificationNotice(response.ok
        ? { text: data.alreadyVerified ? "הכתובת כבר מאומתת." : "שלחנו הודעת אימות חדשה." }
        : { text: data.error || "לא הצלחנו לשלוח הודעת אימות.", error: true });
    } catch {
      setVerificationNotice({ text: "לא הצלחנו להתחבר. נסו שוב בעוד רגע.", error: true });
    } finally {
      setBusy("");
    }
  }

  const profileChanged = displayName.trim() !== savedName && displayName.trim().length >= 2;

  return (
    <div className="account-grid">
      <section className="account-card account-profile-card">
        <div className="account-card-heading">
          <span>פרטים אישיים</span>
          <h2>הפרופיל שלכם</h2>
          <p>השם הזה מופיע באזור האישי ועוזר לנו לפנות אליכם בצורה נעימה.</p>
        </div>
        <form className="account-form" onSubmit={updateProfile}>
          <label>
            שם מלא
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
              <span aria-label={emailVerified ? "כתובת מאומתת" : "כתובת ממתינה לאימות"}>
                {emailVerified ? "מאומתת" : "ממתינה"}
              </span>
            </div>
          </label>
          <small id="email-note">כתובת הדוא״ל משמשת לכניסה ולשחזור החשבון.</small>
          {profileNotice ? (
            <div className={`status-message ${profileNotice.error ? "error" : ""}`} role="status">
              {profileNotice.text}
            </div>
          ) : null}
          <div className="account-form-actions">
            <button className="button button-primary" disabled={busy === "profile" || !profileChanged}>
              {busy === "profile" ? "שומרים…" : "שמירת שינויים"}
            </button>
            {profileChanged ? <span>יש שינויים שעדיין לא נשמרו</span> : null}
          </div>
        </form>
      </section>

      <aside className="account-side-stack">
        <section className={`account-card account-status-card ${plan}`}>
          <div className="account-card-icon" aria-hidden="true">{plan === "plus" ? "✦" : "1"}</div>
          <div>
            <span>המסלול הנוכחי</span>
            <h2>Linkli {plan === "plus" ? "Plus" : "חינם"}</h2>
            <p>{plan === "plus" ? "כל התבניות, עד 10 עמודים וללא מיתוג." : "עמוד אחד, כל כלי העריכה הבסיסיים וללא הגבלת זמן."}</p>
          </div>
          <Link href="/checkout" className="button button-outline button-small">
            {plan === "plus" ? "ניהול המנוי" : "לצפייה ב־Plus"}
          </Link>
        </section>

        <section className="account-card account-trust-card">
          <div className="account-card-heading">
            <span>מצב החשבון</span>
            <h2>{emailVerified ? "החשבון מוגן" : "נדרש אימות נוסף"}</h2>
          </div>
          <ul className="account-check-list">
            <li className={emailVerified ? "complete" : ""}>
              <span aria-hidden="true">{emailVerified ? "✓" : "!"}</span>
              <div><b>כתובת דוא״ל</b><small>{emailVerified ? "הכתובת אומתה בהצלחה" : "הכתובת עדיין לא אומתה"}</small></div>
            </li>
            <li className="complete">
              <span aria-hidden="true">✓</span>
              <div><b>סיסמה אישית</b><small>הכניסה לחשבון מוגנת בסיסמה</small></div>
            </li>
          </ul>
          {!emailVerified ? (
            <button className="button button-outline button-small" onClick={resendVerification} disabled={busy === "verification"}>
              {busy === "verification" ? "שולחים…" : "שליחת אימות מחדש"}
            </button>
          ) : null}
          {verificationNotice ? (
            <div className={`status-message ${verificationNotice.error ? "error" : ""}`} role="status">
              {verificationNotice.text}
            </div>
          ) : null}
        </section>
      </aside>

      <section className="account-card account-card-wide account-password-card">
        <div className="account-password-intro">
          <div className="account-card-icon dark" aria-hidden="true">••</div>
          <div className="account-card-heading">
            <span>אבטחה</span>
            <h2>שינוי סיסמה</h2>
            <p>בחרו משפט ארוך וייחודי. לאחר השינוי תתבקשו להתחבר מחדש בכל המכשירים.</p>
          </div>
        </div>
        <form className="account-form password-change-grid" onSubmit={updatePassword}>
          <label>הסיסמה הנוכחית<input name="currentPassword" type="password" required maxLength={128} autoComplete="current-password" dir="ltr" /></label>
          <label>סיסמה חדשה<input name="newPassword" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" /></label>
          <label>אימות הסיסמה החדשה<input name="confirmation" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" /></label>
          <p className="password-help"><span aria-hidden="true">i</span> לפחות 15 תווים. משפט שקל לכם לזכור וקשה לאחרים לנחש הוא בחירה טובה.</p>
          {passwordNotice ? (
            <div className={`status-message ${passwordNotice.error ? "error" : ""}`} role="status">
              {passwordNotice.text}
            </div>
          ) : null}
          <button className="button button-dark" disabled={busy === "password"}>
            {busy === "password" ? "מעדכנים…" : "עדכון הסיסמה"}
          </button>
        </form>
      </section>
    </div>
  );
}
