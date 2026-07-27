"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "linkli-cookie-notice-v1";

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      // localStorage is only available after hydration; reveal the notice once the browser preference is known.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(STORAGE_KEY) !== "accepted") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function acknowledge() {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch { /* dismiss for this visit */ }
  }

  return <aside className="cookie-notice" role="region" aria-label="מידע על עוגיות ואחסון מקומי">
    <div><strong>מידע קצר על עוגיות</strong><p>Linkli משתמשת בעוגיות חיוניות להתחברות ולפתיחת עמודים מוגנים, ובהעדפות נגישות שנשמרות מקומית במכשיר. אין באתר עוגיות פרסום או מעקב שיווקי.</p><Link href="/legal#privacy">למדיניות הפרטיות המלאה ←</Link></div>
    <button className="button button-dark button-small" onClick={acknowledge}>הבנתי</button>
  </aside>;
}
