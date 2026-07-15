"use client";

import { FormEvent, useState } from "react";

type Notice = { text: string; error?: boolean } | null;

export default function AccountClient({ email, initialName, emailVerified }: { email: string; initialName: string; emailVerified: boolean }) {
  const [displayName, setDisplayName] = useState(initialName);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [verificationNotice, setVerificationNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState("");

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("profile"); setProfileNotice(null);
    const response = await fetch("/api/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "profile", displayName }) });
    const data = await response.json(); setBusy("");
    setProfileNotice(response.ok ? { text: "השם עודכן בהצלחה." } : { text: data.error || "לא הצלחנו לעדכן את הפרטים.", error: true });
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("password"); setPasswordNotice(null);
    const form = new FormData(event.currentTarget);
    if (form.get("newPassword") !== form.get("confirmation")) { setBusy(""); setPasswordNotice({ text: "הסיסמאות החדשות אינן תואמות.", error: true }); return; }
    const response = await fetch("/api/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "password", currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }) });
    const data = await response.json(); setBusy("");
    if (!response.ok) return setPasswordNotice({ text: data.error || "לא הצלחנו לעדכן את הסיסמה.", error: true });
    window.location.assign(data.redirectTo || "/login?passwordChanged=1");
  }

  async function resendVerification() {
    setBusy("verification"); setVerificationNotice(null);
    const response = await fetch("/api/auth/verification/request", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const data = await response.json(); setBusy("");
    setVerificationNotice(response.ok ? { text: data.alreadyVerified ? "הכתובת כבר מאומתת." : "שלחנו הודעת אימות חדשה." } : { text: data.error || "לא הצלחנו לשלוח הודעת אימות.", error: true });
  }

  return <div className="account-grid">
    <section className="account-card">
      <div className="account-card-heading"><span>פרטים אישיים</span><h2>פרטי החשבון</h2><p>השם יוצג באזור האישי ובפרטי החשבון.</p></div>
      <form className="account-form" onSubmit={updateProfile}>
        <label>שם מלא<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={80} autoComplete="name" required /></label>
        <label>כתובת דוא״ל<input value={email} readOnly dir="ltr" aria-describedby="email-note" /></label>
        <small id="email-note">לא ניתן לשנות את כתובת הדוא״ל בשלב זה.</small>
        {profileNotice ? <div className={`status-message ${profileNotice.error ? "error" : ""}`} role="status">{profileNotice.text}</div> : null}
        <button className="button button-primary" disabled={busy === "profile"}>{busy === "profile" ? "שומרים…" : "שמירת פרטים"}</button>
      </form>
    </section>

    <section className="account-card">
      <div className="account-card-heading"><span>אבטחת החשבון</span><h2>כתובת דוא״ל</h2><p>{emailVerified ? "כתובת הדוא״ל של החשבון אומתה." : "אימות הכתובת יאפשר שחזור גישה מאובטח יותר."}</p></div>
      <div className={`verification-status ${emailVerified ? "verified" : "pending"}`}><b>{emailVerified ? "✓ כתובת מאומתת" : "! ממתינה לאימות"}</b><span dir="ltr">{email}</span></div>
      {!emailVerified ? <button className="button button-outline" onClick={resendVerification} disabled={busy === "verification"}>{busy === "verification" ? "שולחים…" : "שליחת הודעת אימות"}</button> : null}
      {verificationNotice ? <div className={`status-message ${verificationNotice.error ? "error" : ""}`} role="status">{verificationNotice.text}</div> : null}
    </section>

    <section className="account-card account-card-wide">
      <div className="account-card-heading"><span>כניסה לחשבון</span><h2>שינוי סיסמה</h2><p>לאחר השינוי תתבקשו להתחבר מחדש בכל המכשירים.</p></div>
      <form className="account-form password-change-grid" onSubmit={updatePassword}>
        <label>הסיסמה הנוכחית<input name="currentPassword" type="password" required maxLength={128} autoComplete="current-password" dir="ltr" /></label>
        <label>סיסמה חדשה<input name="newPassword" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" /></label>
        <label>אימות הסיסמה החדשה<input name="confirmation" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" /></label>
        <p className="password-help">השתמשו ב־15 תווים לפחות. משפט ארוך וייחודי בדרך כלל בטוח וקל יותר לזכור.</p>
        {passwordNotice ? <div className={`status-message ${passwordNotice.error ? "error" : ""}`} role="status">{passwordNotice.text}</div> : null}
        <button className="button button-dark" disabled={busy === "password"}>{busy === "password" ? "מעדכנים…" : "עדכון הסיסמה"}</button>
      </form>
    </section>
  </div>;
}
