"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ConfirmClient({
  token,
  purpose,
  email,
}: {
  token: string;
  purpose: "change_password" | "delete_account";
  email: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deleting = purpose === "delete_account";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          purpose,
          confirmation: deleting ? form.get("confirmation") : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "לא הצלחנו להשלים את הפעולה.");
        setBusy(false);
        return;
      }
      window.location.replace(data.redirectTo || (deleting ? "/login?accountDeleted=1" : "/login?passwordChanged=1"));
    } catch {
      setError("לא הצלחנו להתחבר. בדקו את החיבור ונסו שוב.");
      setBusy(false);
    }
  }

  return (
    <form className={`account-confirm-card ${deleting ? "is-danger" : ""}`} method="post" action="/api/forms/noscript" onSubmit={submit}>
      <span className="account-kicker">{deleting ? "מחיקת חשבון" : "שינוי סיסמה"}</span>
      <h1>{deleting ? "המחיקה סופית ואי אפשר לבטל אותה" : "לאשר את שינוי הסיסמה"}</h1>
      {deleting ? (
        <>
          <p>לחיצה על האישור תמחק את החשבון, כל העמודים שפורסמו והטיוטות. אי אפשר לשחזר את זה אחר כך.</p>
          <ul className="account-confirm-points">
            <li>כל העמודים והקישורים הציבוריים ייעלמו</li>
            <li>אי אפשר להתחבר שוב עם אותה כתובת בלי להירשם מחדש</li>
            <li>הפעולה לא ניתנת לביטול</li>
          </ul>
          <label>
            הקלידו את כתובת הדוא״ל לאישור
            <input name="confirmation" type="email" required dir="ltr" autoComplete="email" placeholder={email} />
          </label>
        </>
      ) : (
        <p>אחרי האישור הסיסמה החדשה תיכנס לתוקף, וצריך להתחבר מחדש בכל המכשירים.</p>
      )}
      {error ? <div className="status-message error" role="alert">{error}</div> : null}
      <div className="account-confirm-actions">
        <button className={`button ${deleting ? "button-danger-solid" : "button-dark"}`} disabled={busy}>
          {busy ? "מבצעים…" : deleting ? "מחיקת החשבון לצמיתות" : "אישור שינוי הסיסמה"}
        </button>
        <Link href="/account" className="button button-outline">ביטול וחזרה</Link>
      </div>
    </form>
  );
}
