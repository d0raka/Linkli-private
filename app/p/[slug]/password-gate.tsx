"use client";

import { FormEvent, useState } from "react";

export default function PasswordGate({ slug, title, emoji, accent, accentSoft }: { slug: string; title: string; emoji: string; accent: string; accentSoft: string }) {
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true); setError("");
    const password = String(new FormData(event.currentTarget).get("password") || "");
    const response = await fetch(`/api/public/${slug}/unlock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await response.json();
    if (!response.ok) { setWorking(false); setError(data.error || "לא הצלחנו לפתוח את העמוד."); return; }
    window.location.reload();
  }

  return <main className="page-lock-shell" id="main-content" style={{ "--page-soft": accentSoft, "--page-accent": accent } as React.CSSProperties}>
    <section className="page-lock-card"><div className="page-lock-icon"><span>{emoji}</span><i aria-hidden="true">🔒</i></div><span className="preview-mini-label">עמוד מוגן</span><h1>{title}</h1><p>העמוד הזה מוגן בסיסמה. הזינו אותה כדי להמשיך.</p>
      <form method="post" action="/api/forms/noscript" onSubmit={unlock}><label htmlFor="page-password">סיסמת העמוד</label><input id="page-password" name="password" type="password" required minLength={6} maxLength={64} autoComplete="current-password" autoFocus dir="ltr" />{error && <div className="auth-error" role="alert">{error}</div>}<button className="button button-primary" disabled={working}>{working ? "פותחים…" : "פתיחת העמוד"}</button></form>
      <small>הסיסמה נבדקת בצורה מאובטחת ואינה נשמרת בדפדפן.</small>
    </section>
  </main>;
}
