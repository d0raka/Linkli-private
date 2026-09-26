"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle, HourglassMedium, SignIn } from "@phosphor-icons/react/ssr";
import { getPlanName, pageLimit, type PlanType } from "@/lib/plans";

export default function PaymentSuccessClient({ state, plan, bonusPages = 0 }: { state: "signin" | "processing" | "paid"; plan?: PlanType | null; bonusPages?: number }) {
  const [current, setCurrent] = useState(state);
  const [currentPlan, setCurrentPlan] = useState<PlanType>(plan || "free");
  const [gaveUp, setGaveUp] = useState(false);

  // The browser redirect proves nothing; the plan is granted only after the provider webhook lands.
  useEffect(() => {
    if (state !== "processing") return;
    let cancelled = false;
    let attempts = 0;
    async function poll() {
      attempts += 1;
      try {
        const response = await fetch("/api/billing/status", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (data.entitled) {
          setCurrent("paid");
          setCurrentPlan(data.plan);
          return;
        }
      } catch {
        /* keep polling */
      }
      if (cancelled) return;
      if (attempts < 15) window.setTimeout(poll, 2000);
      else setGaveUp(true);
    }
    const timer = window.setTimeout(poll, 1500);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [state]);

  if (current === "signin") {
    return (
      <section className="status-page" aria-live="polite">
        <span className="status-page__icon" aria-hidden="true"><SignIn /></span>
        <h1>נכנסים כדי לאשר את התשלום</h1>
        <p>המסלול מופעל רק אחרי שספק התשלום מאשר. אחרי הכניסה נבדוק אם התשלום נקלט.</p>
        <div className="status-page__actions"><Link href="/login?returnTo=/account" className="ui-button" data-variant="primary">כניסה</Link></div>
      </section>
    );
  }

  if (current === "processing") {
    return (
      <section className="status-page" aria-live="polite">
        <span className="status-page__icon" aria-hidden="true"><HourglassMedium /></span>
        <h1>{gaveUp ? "האישור מתעכב" : "מחכים לאישור מספק התשלום"}</h1>
        <p>{gaveUp ? "זה קורה לפעמים. המסלול יתעדכן לבד ברגע שהאישור יגיע, ואפשר לבדוק שוב בהגדרות החשבון." : "אם שילמתם עכשיו, זה לוקח בדרך כלל כמה שניות. הדף מתעדכן לבד."}</p>
        <div className="status-page__actions">
          <Link href="/account#plan" className="ui-button">למסלול שלי</Link>
          {gaveUp ? <Link href="/contact?topic=billing" className="ui-button" data-variant="ghost">פנייה לעזרה</Link> : null}
        </div>
      </section>
    );
  }

  const name = getPlanName(currentPlan);
  return (
    <section className="status-page" aria-live="polite">
      <span className="status-page__icon" aria-hidden="true"><CheckCircle weight="fill" /></span>
      <h1>מסלול {name} פעיל</h1>
      <p>תודה! עכשיו אפשר לפרסם עד {pageLimit(currentPlan, bonusPages)} עמודים, בלי הסימן של Linkli.</p>
      <div className="status-page__actions"><Link href="/studio" className="ui-button" data-variant="primary">לעמודים שלי</Link></div>
    </section>
  );
}
