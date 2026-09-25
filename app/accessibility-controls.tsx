"use client";

import { useEffect, useState } from "react";
import { resolveReduceMotion } from "@/lib/a11y";

type Preferences = { font: number; contrast: boolean; links: boolean; motion: boolean };
const defaults: Preferences = { font: 100, contrast: false, links: false, motion: false };

function applyPreferences(preferences: Preferences) {
  const root = document.documentElement;
  root.style.fontSize = `${preferences.font}%`;
  root.dataset.highContrast = String(preferences.contrast);
  root.dataset.underlineLinks = String(preferences.links);
  root.dataset.reduceMotion = String(preferences.motion);
}

export default function AccessibilityControls() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const storageSync = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem("linkli-a11y-dismissed") === "true") {
          setDismissed(true);
        }
        const systemPrefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const saved = localStorage.getItem("linkli-accessibility");
        const parsedSaved = saved ? JSON.parse(saved) as Partial<Preferences> : null;
        const parsed = {
          ...defaults,
          ...(parsedSaved || {}),
          motion: resolveReduceMotion({
            saved: typeof parsedSaved?.motion === "boolean" ? parsedSaved.motion : undefined,
            systemPrefersReduce,
          }),
        } as Preferences;
        setPreferences(parsed);
        applyPreferences(parsed);
      } catch { /* keep accessible defaults */ }
    }, 0);
    return () => window.clearTimeout(storageSync);
  }, []);

  function dismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setDismissed(true);
    setOpen(false);
    try { sessionStorage.setItem("linkli-a11y-dismissed", "true"); } catch { /* session storage unavailable */ }
  }

  function update(next: Preferences) {
    setPreferences(next);
    applyPreferences(next);
    try { localStorage.setItem("linkli-accessibility", JSON.stringify(next)); } catch { /* preferences remain for this visit */ }
  }

  function reset() {
    const systemPrefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    update({ ...defaults, motion: resolveReduceMotion({ systemPrefersReduce }) });
  }

  if (dismissed) return null;

  return <div className="a11y-widget">
    <div className="a11y-trigger-wrapper">
      <button className="a11y-dismiss" aria-label="הסתרת תפריט נגישות לסשן זה" title="הסתרת תפריט נגישות" onClick={dismiss}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 2L10 10M10 2L2 10" />
        </svg>
      </button>
      <button className="a11y-trigger" aria-label="פתיחת תפריט נגישות" aria-expanded={open} aria-controls="a11y-menu" onClick={() => setOpen((value) => !value)}>
        <span className="a11y-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="14.8" cy="4" r="2" />
            <path d="M13.8 6.2 11.6 12" />
            <path d="M13.2 8.7h5.4" />
            <path d="M7.6 12h10.4" />
            <path d="M18 12v5.4h2.2" />
            <circle cx="9" cy="16.5" r="4.7" />
            <circle cx="18" cy="19.2" r="1.5" />
          </svg>
        </span>
        <span className="a11y-label">נגישות</span>
      </button>
    </div>
    {open && <section className="a11y-menu" id="a11y-menu" aria-label="אפשרויות נגישות">
      <div className="a11y-menu-head">
        <strong>התאמות נגישות</strong>
        <button aria-label="סגירת תפריט נגישות" onClick={() => setOpen(false)}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 1L11 11M11 1L1 11" />
          </svg>
        </button>
      </div>
      <div className="a11y-font-row"><button onClick={() => update({ ...preferences, font: Math.max(90, preferences.font - 10) })} aria-label="הקטנת טקסט">א−</button><span>{preferences.font}%</span><button onClick={() => update({ ...preferences, font: Math.min(130, preferences.font + 10) })} aria-label="הגדלת טקסט">א+</button></div>
      <button className={preferences.contrast ? "active" : ""} aria-pressed={preferences.contrast} onClick={() => update({ ...preferences, contrast: !preferences.contrast })}>◐ ניגודיות גבוהה</button>
      <button className={preferences.links ? "active" : ""} aria-pressed={preferences.links} onClick={() => update({ ...preferences, links: !preferences.links })}>_ הדגשת קישורים</button>
      <button className={preferences.motion ? "active" : ""} aria-pressed={preferences.motion} onClick={() => update({ ...preferences, motion: !preferences.motion })}>◼ עצירת אנימציות</button>
      <button className="a11y-reset" onClick={reset}>איפוס התאמות</button>
      <a href="/accessibility">להצהרת הנגישות המלאה ←</a>
    </section>}
  </div>;
}
