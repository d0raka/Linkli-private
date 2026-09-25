"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPlanName, pageLimit, type PlanType } from "@/lib/plans";

export default function PaymentSuccessClient({
  state,
  plan,
  bonusPages = 0,
}: {
  state: "signin" | "processing" | "paid";
  plan?: PlanType | null;
  bonusPages?: number;
}) {
  const [current, setCurrent] = useState(state);
  const [currentPlan, setCurrentPlan] = useState<PlanType>(plan || "free");

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
        /* keep processing */
      }
      if (!cancelled && attempts < 15) window.setTimeout(poll, 2000);
    }
    const timer = window.setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [state]);

  if (current === "signin") {
    return (
      <div className="legal-card" style={{ textAlign: "center", padding: "40px 24px" }}>
        <h1 style={{ fontSize: 28, margin: "16px 0 8px" }}>מתחברים כדי לאשר את התשלום</h1>
        <p style={{ maxWidth: 460, margin: "0 auto 24px", color: "var(--muted)", lineHeight: 1.6 }}>
          אי אפשר לסמן מסלול כפעיל לפי הקישור בלבד. אחרי ההתחברות נבדוק אם התשלום נקלט.
        </p>
        <Link href="/login?returnTo=/payment/success" className="button button-primary">התחברות</Link>
      </div>
    );
  }

  if (current === "processing") {
    return (
      <div className="legal-card" style={{ textAlign: "center", padding: "40px 24px" }}>
        <span className="score-pill" style={{ background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74" }}>
          התשלום בבדיקה
        </span>
        <h1 style={{ fontSize: 28, margin: "16px 0 8px" }}>עוד לא קיבלנו אישור מהסליקה</h1>
        <p style={{ maxWidth: 460, margin: "0 auto 24px", color: "var(--muted)", lineHeight: 1.6 }}>
          אם שילמתם עכשיו, זה יכול לקחת כמה שניות. המסלול יתעדכן לבד ברגע שההזמנה תסומן כשולמה.
        </p>
        <Link href="/checkout" className="button button-outline">חזרה לחיוב</Link>
      </div>
    );
  }

  const name = getPlanName(currentPlan);
  return (
    <div className="legal-card" style={{ textAlign: "center", padding: "40px 24px" }}>
      <div style={{ fontSize: 72, marginBottom: 12 }}>🎉</div>
      <span className="score-pill" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" }}>
        מסלול {name} פעיל
      </span>
      <h1 style={{ fontSize: 28, margin: "16px 0 8px" }}>תודה שהצטרפת ל-{name}</h1>
      <p style={{ maxWidth: 460, margin: "0 auto 24px", color: "var(--muted)", lineHeight: 1.6 }}>
        החשבון שודרג. עכשיו אפשר ליצור עד <strong>{pageLimit(currentPlan, bonusPages)}</strong> עמודים במכסה של המסלול.
      </p>
      <Link href="/studio" className="button button-primary">לסטודיו ←</Link>
    </div>
  );
}
