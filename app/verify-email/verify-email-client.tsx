"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle, EnvelopeSimple } from "@phosphor-icons/react/ssr";
import { Button } from "@/app/ui/button";
import { Notice } from "@/app/ui/status";

type State = "idle" | "working" | "verified" | "sent" | "error";

export default function VerifyEmailClient({ token, sent, deliveryUnavailable, returnTo }: { token: string; sent: boolean; deliveryUnavailable: boolean; returnTo: string }) {
  const [state, setState] = useState<State>(sent ? "sent" : deliveryUnavailable ? "error" : "idle");
  const [message, setMessage] = useState(sent ? "שלחנו אליכם הודעה עם קישור לאימות." : deliveryUnavailable ? "לא הצלחנו לשלוח את הודעת האימות. אפשר לשלוח שוב." : "");

  async function post(path: string, body: Record<string, unknown>) {
    const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  }

  async function confirm() {
    setState("working");
    setMessage("");
    try {
      const { ok, data } = await post("/api/auth/verification/confirm", { token });
      if (!ok) { setState("error"); setMessage(data.error || "לא הצלחנו לאמת את הכתובת."); return; }
      setState("verified");
      setMessage("כתובת הדוא״ל אומתה.");
    } catch {
      setState("error");
      setMessage("לא הצלחנו להתחבר. בדקו את החיבור ונסו שוב.");
    }
  }

  async function resend() {
    setState("working");
    setMessage("");
    try {
      const { ok, data } = await post("/api/auth/verification/request", { returnTo });
      if (!ok) { setState("error"); setMessage(data.error || "לא הצלחנו לשלוח הודעה חדשה."); return; }
      setState(data.alreadyVerified ? "verified" : "sent");
      setMessage(data.alreadyVerified ? "כתובת הדוא״ל כבר מאומתת." : "שלחנו הודעת אימות חדשה.");
    } catch {
      setState("error");
      setMessage("לא הצלחנו להתחבר. בדקו את החיבור ונסו שוב.");
    }
  }

  if (state === "verified") {
    return (
      <div className="auth-complete" role="status">
        <span className="auth-complete__icon" aria-hidden="true"><CheckCircle weight="fill" /></span>
        <h2>הכתובת אומתה</h2>
        <p>{message}</p>
        <div className="auth-complete__actions"><Link href={returnTo} className="ui-button" data-variant="primary">המשך לעמודים שלי</Link></div>
      </div>
    );
  }

  return (
    <div className="auth-complete">
      <span className="auth-complete__icon" aria-hidden="true"><EnvelopeSimple /></span>
      {token ? (
        <>
          <h2>עוד לחיצה אחת</h2>
          <p>לחצו כדי להשלים את אימות הכתובת.</p>
          <div className="auth-complete__actions"><Button variant="primary" onClick={confirm} loading={state === "working"} loadingLabel="מאמתים…">אימות הכתובת</Button></div>
        </>
      ) : (
        <>
          <h2>בדקו את תיבת הדוא״ל</h2>
          <p>{deliveryUnavailable ? "ההודעה הקודמת לא נשלחה. אפשר לשלוח הודעה חדשה." : "פתחו את ההודעה ששלחנו ולחצו על הקישור. לא הגיעה? בדקו גם בתיקיית הספאם."}</p>
          <div className="auth-complete__actions"><Button onClick={resend} loading={state === "working"} loadingLabel="שולחים…">שליחה חוזרת</Button></div>
        </>
      )}
      {message ? <Notice tone={state === "error" ? "danger" : "success"}>{message}</Notice> : null}
    </div>
  );
}
