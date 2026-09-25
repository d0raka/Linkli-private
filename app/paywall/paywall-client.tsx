"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PLAN_CATALOG, getPlanName, type PlanType } from "@/lib/plans";

type PaywallUser = {
  plan: PlanType;
  bonusPages: number;
  pageLimit: number;
  referralCode: string;
  referralUrl: string;
};

export default function PaywallClient({
  user,
  startHref,
}: {
  user: PaywallUser | null;
  startHref: string;
}) {
  const [copied, setCopied] = useState(false);
  const currentPlan = user?.plan || "free";

  const cards = useMemo(() => PLAN_CATALOG, []);

  async function copyReferral() {
    if (!user?.referralUrl) return;
    try {
      await navigator.clipboard.writeText(user.referralUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="paywall-page">
      <header className="paywall-nav wrap">
        <Link href={user ? "/studio" : "/"} className="brand">Link<span>li</span></Link>
        <div className="paywall-nav-links">
          <Link href="/#templates">תבניות</Link>
          {user ? <Link className="button button-small button-dark" href="/studio">לסטודיו</Link> : <Link className="button button-small button-dark" href={startHref}>הרשמה חינם</Link>}
        </div>
      </header>

      <section className="paywall-hero wrap">
        
        <span className="kicker">מסלולים</span>
        <h1>כמה עמודים צריך הפעם.</h1>
        <p>עמוד מפורסם אחד · טיוטות ללא הגבלה. יוצר לתמונות ומוזיקה. אירוע לאישורי הגעה, יומן וניווט.</p>
        {user ? (
          <p className="paywall-current">המסלול אצלך עכשיו: <b>{getPlanName(currentPlan)}</b>{user.bonusPages ? ` · ${user.pageLimit} עמודים במכסה, כולל ${user.bonusPages} מעמודי הפניה` : ""}</p>
        ) : null}
      </section>

      <section className="paywall-grid wrap" aria-label="מסלולי Linkli">
        {cards.map((plan) => {
          const current = currentPlan === plan.id;
          const href = plan.id === "free"
            ? (user ? "/studio" : startHref)
            : plan.waitlist
              ? "/checkout?plan=business"
              : user
                ? `/checkout?plan=${plan.id}`
                : `/register?returnTo=${encodeURIComponent(`/checkout?plan=${plan.id}`)}`;
          return (
            <article className={`paywall-card ${plan.featured ? "is-featured" : ""} ${current ? "is-current" : ""}`} key={plan.id}>
              {plan.featured ? <span className="paywall-ribbon">הבחירה ליצירה</span> : null}
              <span className="paywall-plan-name">{plan.name}</span>
              <h2>{plan.price} <small>{plan.cadence}</small></h2>
              <p>{plan.summary}</p>
              <ul>
                {plan.features.map((item) => <li key={item}>{item}</li>)}
                {plan.blocked.map((item) => <li className="is-blocked" key={item}>{item}</li>)}
              </ul>
              {current ? (
                <span className="paywall-current-pill">המסלול הנוכחי</span>
              ) : (
                <Link className={`button ${plan.featured ? "button-primary" : "button-outline"}`} href={href}>
                  {plan.id === "free" ? (user ? "חזרה לסטודיו" : "מתחילים בחינם") : plan.waitlist ? "להרשמה מוקדמת" : `בחירת ${plan.name}`}
                </Link>
              )}
            </article>
          );
        })}
      </section>

      <section className="paywall-referral wrap">
        <div className="paywall-referral-card">
          <span className="kicker">תוכנית הפניות</span>
          <h2>מזמינים חבר. מקבלים עמוד במסלול יוצר מתנה.</h2>
          <p>כל משתמש מקבל קוד ייחודי. כשמישהו נרשם דרך הקישור ורוכש מסלול יוצר ומעלה, מתווסף אצלך אוטומטית עמוד במסלול יוצר נוסף למכסה.</p>
          {user?.referralUrl ? (
            <div className="paywall-referral-copy">
              <code dir="ltr">{user.referralUrl}</code>
              <button type="button" className="button button-primary" onClick={copyReferral}>{copied ? "הועתק" : "העתקת הקישור"}</button>
            </div>
          ) : (
            <Link className="button button-primary" href={startHref}>פתיחת חשבון וקבלת קוד</Link>
          )}
        </div>
      </section>
    </div>
  );
}
