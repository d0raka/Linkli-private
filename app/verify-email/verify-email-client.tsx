"use client";

import Link from "next/link";
import { useState } from "react";

export default function VerifyEmailClient({ token, sent, deliveryUnavailable, returnTo }: { token: string; sent: boolean; deliveryUnavailable: boolean; returnTo: string }) {
  const [state, setState] = useState<"idle" | "working" | "verified" | "sent" | "error">(sent ? "sent" : deliveryUnavailable ? "error" : "idle");
  const [message, setMessage] = useState(sent ? "שלחנו אליכם הודעה עם קישור לאימות הכתובת." : deliveryUnavailable ? "לא הצלחנו לשלוח את הודעת האימות. אפשר לנסות לשלוח הודעה חדשה." : "");

  async function confirm() {
    setState("working"); setMessage("");
    const response = await fetch("/api/auth/verification/confirm", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }),
    });
    const data = await response.json();
    if (!response.ok) { setState("error"); setMessage(data.error || "לא הצלחנו לאמת את הכתובת."); return; }
    setState("verified"); setMessage("כתובת הדוא״ל אומתה בהצלחה.");
  }

  async function resend() {
    setState("working"); setMessage("");
    const response = await fetch("/api/auth/verification/request", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ returnTo }),
    });
    const data = await response.json();
    if (!response.ok) { setState("error"); setMessage(data.error || "לא הצלחנו לשלוח הודעה חדשה."); return; }
    setState(data.alreadyVerified ? "verified" : "sent");
    setMessage(data.alreadyVerified ? "כתובת הדוא״ל כבר מאומתת." : "שלחנו הודעת אימות חדשה.");
  }

  if (state === "verified") return <div className="auth-complete"><div className="auth-complete-icon">✓</div><h2>הכתובת אומתה</h2><p>{message}</p><Link href={returnTo} className="button button-primary">המשך לאזור האישי</Link></div>;

  return <div className="verification-actions">
    <h2>אימות כתובת דוא״ל</h2>
    {token ? <><p>לחצו על הכפתור כדי להשלים את אימות כתובת הדוא״ל.</p><button className="button button-primary" onClick={confirm} disabled={state === "working"}>{state === "working" ? "מאמתים…" : "אימות כתובת הדוא״ל"}</button></> : <><p>{deliveryUnavailable ? "ההודעה הקודמת לא נשלחה. נסו לשלוח הודעת אימות חדשה." : "פתחו את ההודעה שנשלחה אליכם ולחצו על קישור האימות."}</p><button className="button button-outline" onClick={resend} disabled={state === "working"}>{state === "working" ? "שולחים…" : "שליחת הודעה נוספת"}</button></>}
    {message ? <div className={state === "error" ? "auth-error" : "auth-success"} role="status">{message}</div> : null}
    <Link href="/" className="auth-secondary-link">חזרה לעמוד הבית</Link>
  </div>;
}
