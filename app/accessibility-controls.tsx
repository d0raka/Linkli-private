"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem("linkli-accessibility");
      if (saved) {
        const parsed = { ...defaults, ...JSON.parse(saved) } as Preferences;
        // Loading a device-local preference is the purpose of this mount effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreferences(parsed);
        applyPreferences(parsed);
      }
    } catch { /* keep accessible defaults */ }
  }, []);

  function update(next: Preferences) {
    setPreferences(next);
    applyPreferences(next);
    try { localStorage.setItem("linkli-accessibility", JSON.stringify(next)); } catch { /* preferences remain for this visit */ }
  }

  function reset() { update(defaults); }

  return <div className="a11y-widget">
    <button className="a11y-trigger" aria-label="פתיחת תפריט נגישות" aria-expanded={open} aria-controls="a11y-menu" onClick={() => setOpen((value) => !value)}>♿</button>
    {open && <section className="a11y-menu" id="a11y-menu" aria-label="אפשרויות נגישות">
      <div className="a11y-menu-head"><strong>התאמות נגישות</strong><button aria-label="סגירת תפריט נגישות" onClick={() => setOpen(false)}>×</button></div>
      <div className="a11y-font-row"><button onClick={() => update({ ...preferences, font: Math.max(90, preferences.font - 10) })} aria-label="הקטנת טקסט">א−</button><span>{preferences.font}%</span><button onClick={() => update({ ...preferences, font: Math.min(130, preferences.font + 10) })} aria-label="הגדלת טקסט">א+</button></div>
      <button className={preferences.contrast ? "active" : ""} aria-pressed={preferences.contrast} onClick={() => update({ ...preferences, contrast: !preferences.contrast })}>◐ ניגודיות גבוהה</button>
      <button className={preferences.links ? "active" : ""} aria-pressed={preferences.links} onClick={() => update({ ...preferences, links: !preferences.links })}>_ הדגשת קישורים</button>
      <button className={preferences.motion ? "active" : ""} aria-pressed={preferences.motion} onClick={() => update({ ...preferences, motion: !preferences.motion })}>◼ עצירת אנימציות</button>
      <button className="a11y-reset" onClick={reset}>איפוס התאמות</button>
      <a href="/accessibility">להצהרת הנגישות המלאה ←</a>
    </section>}
  </div>;
}
