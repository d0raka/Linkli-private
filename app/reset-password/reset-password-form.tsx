"use client";

import Link from "next/link";
import PasswordMeter from "@/app/password-meter";
import { FormEvent, useId, useState } from "react";
import { LinkBreak } from "@phosphor-icons/react/ssr";
import { apiFetch, errorMessage, safeRelativePath } from "@/lib/api-client";
import { Button } from "@/app/ui/button";
import { Notice } from "@/app/ui/status";

export default function ResetPasswordForm({ token }: { token: string }) {
  const id = useId();
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmation")) {
      setSending(false);
      setError("הסיסמאות לא זהות. הקלידו שוב את הסיסמה החדשה בשני השדות.");
      return;
    }
    try {
      const payload = await apiFetch<{ redirectTo?: string }>("/api/auth/password/reset", { method: "POST", json: { token, password: data.get("password") } });
      window.location.assign(safeRelativePath(payload.redirectTo, "/studio"));
    } catch (caught) {
      setError(errorMessage(caught, "לא הצלחנו לעדכן את הסיסמה."));
      setSending(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-complete" role="alert">
        <span className="auth-complete__icon" aria-hidden="true"><LinkBreak /></span>
        <h2>הקישור לא תקין</h2>
        <p>הקישור חסר או שתוקפו פג. אפשר לבקש קישור חדש.</p>
        <div className="auth-complete__actions"><Link href="/forgot-password" className="ui-button" data-variant="primary">בקשת קישור חדש</Link></div>
      </div>
    );
  }

  return (
    <form className="auth-form" method="post" action="/api/forms/noscript" onSubmit={submit}>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-password`}>סיסמה חדשה</label>
        <input id={`${id}-password`} className="ui-input" value={password} onChange={(event) => setPassword(event.target.value)} name="password" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" autoFocus aria-describedby={`${id}-help`} />
        <PasswordMeter value={password} />
        <p className="ui-hint" id={`${id}-help`}>לפחות 15 תווים, ושונה מהסיסמה הקודמת.</p>
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-confirmation`}>הסיסמה החדשה שוב</label>
        <input id={`${id}-confirmation`} className="ui-input" name="confirmation" type="password" required minLength={15} maxLength={128} autoComplete="new-password" dir="ltr" />
      </div>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="submit" variant="primary" size="lg" block loading={sending} loadingLabel="מעדכנים…">עדכון הסיסמה</Button>
    </form>
  );
}
