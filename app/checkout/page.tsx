import Link from "next/link";
import { requireProductUser } from "@/lib/auth";
import CheckoutClient from "./checkout-client";
import CheckoutPlanSwitcher from "./checkout-plan-switcher";
import MarketingWaitlistForm from "@/app/marketing-waitlist-form";
import { PLAN_CATALOG, getPlanName, isPaidPlan, pageLimit, parsePurchasablePlan, planRank } from "@/lib/plans";
import { availableCheckoutMethods } from "@/lib/billing";
import { runtimeValue } from "@/db";
import AppShell from "@/app/app-shell/app-shell";

export const dynamic = "force-dynamic";
export const metadata = { title: "מנוי וחיוב | Linkli", robots: { index: false, follow: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireProductUser("/checkout");
  const rawParams = await searchParams;
  const rawPlan = Array.isArray(rawParams.plan) ? rawParams.plan[0] : rawParams.plan;
  const waitlistPlan = PLAN_CATALOG.find((plan) => plan.waitlist && plan.id === rawPlan);
  const requested = parsePurchasablePlan(rawPlan) || "pro";
  const selected = waitlistPlan || PLAN_CATALOG.find((plan) => plan.id === requested) || PLAN_CATALOG.find((plan) => plan.id === "pro")!;
  const alreadyCovered = isPaidPlan(user.plan) && planRank(user.plan) >= planRank(selected.id);
  const availableMethods = availableCheckoutMethods();
  const portalReady = Boolean(runtimeValue("BILLING_PORTAL_URL"));
  const limit = pageLimit(user.plan, user.bonusPages);

  return (
    <AppShell user={user} current="account">
      <div className="checkout-shell">
      <div className="checkout-main">
        <Link href="/studio" className="account-back"><span aria-hidden="true">→</span> חזרה לסטודיו</Link>
        <div className="account-hero checkout-account-hero">
          <div className="account-hero-avatar subscription-avatar" aria-hidden="true">{isPaidPlan(user.plan) ? "✦" : "+"}</div>
          <div>
            <span className="kicker">מנוי וחיוב</span>
            <h1>{alreadyCovered ? "המסלול שלך" : `שדרוג ל-${selected.name}`}</h1>
            <p>{alreadyCovered ? "כל פרטי המסלול והגישה במקום אחד." : selected.summary}</p>
          </div>
        </div>
        <nav className="settings-tabs" aria-label="הגדרות החשבון">
          <Link href="/account"><span aria-hidden="true">◉</span> פרופיל ואבטחה</Link>
          <Link href="/checkout" className="active" aria-current="page"><span aria-hidden="true">◇</span> מנוי וחיוב</Link>
        </nav>

        {alreadyCovered ? (
          <section className="subscription-active">
            <div className="subscription-active-main">
              <div className="subscription-active-topline">
                <span className="subscription-status"><i /> מסלול פעיל</span>
                <span>Linkli {getPlanName(user.plan)}</span>
              </div>
              <div className="subscription-active-copy">
                <div>
                  <span>המסלול הנוכחי</span>
                  <h2>Linkli {getPlanName(user.plan)}</h2>
                  <p>עד {limit} עמודים במכסה{user.bonusPages ? `, כולל ${user.bonusPages} מעמודי הפניה` : ""}, בלי מיתוג Linkli.</p>
                </div>
              </div>
              <div className="subscription-active-actions">
                <Link href="/studio" className="button button-primary">חזרה לעמודים שלי</Link>
                <CheckoutPlanSwitcher currentPlan={user.plan} email={user.email} label="לכל המסלולים" />
                {portalReady ? (
                  <form action="/api/billing/portal" method="post">
                    <button className="button button-outline">ניהול חיוב וביטול</button>
                  </form>
                ) : (
                  <Link href="/contact?topic=billing" className="button button-outline">עזרה עם המנוי</Link>
                )}
              </div>
            </div>
            <aside className="subscription-included-card">
              <span>כלול במסלול</span>
              <h2>{getPlanName(user.plan)} פותח יותר מקום ליצור</h2>
              <ul className="subscription-feature-list">
                {(PLAN_CATALOG.find((plan) => plan.id === user.plan)?.features || []).map((item) => (
                  <li key={item}><span>✓</span><div><b>{item}</b></div></li>
                ))}
              </ul>
            </aside>
          </section>
        ) : (
          <>
            <section className="subscription-plan-banner">
              <div>
                <span className="subscription-plan-label">{selected.name.toUpperCase()}</span>
                <h2>{selected.summary}</h2>
                <p>אפשר תמיד לחזור ל<CheckoutPlanSwitcher currentPlan={user.plan} email={user.email} label="כל המסלולים" variant="link" /> ולבחור אחר.</p>
              </div>
              <div className="subscription-plan-price"><strong>{selected.price}</strong><span>{selected.cadence}</span></div>
            </section>
            <div className="checkout-grid">
              <aside className="order-card">
                <span className="checkout-section-label">מה מקבלים</span>
                <h2>הכול פתוח ב-{selected.name}</h2>
                <ul className="subscription-feature-list order-list">
                  {selected.features.map((item) => (
                    <li key={item}><span>✓</span><div><b>{item}</b></div></li>
                  ))}
                </ul>
                <div className="order-total"><span>סה״כ</span><strong>{selected.price}</strong></div>
              </aside>
              {selected.waitlist ? (
                <section className="payment-card">
                  <span className="checkout-section-label">רשימת המתנה</span>
                  <h2>Business נפתח בהדרגה</h2>
                  <p>אפשר להשאיר פרטים, ונחזור כשהמסלול יהיה זמין לרכישה.</p>
                  <MarketingWaitlistForm compact defaultEmail={user.email} />
                </section>
              ) : (
                <CheckoutClient email={user.email} plan={requested} priceLabel={selected.price} availableMethods={availableMethods} />
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </AppShell>
  );
}
