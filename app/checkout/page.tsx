import Link from "next/link";
import { requireProductUser } from "@/lib/auth";
import CheckoutClient from "./checkout-client";
import { PROJECT_LIMITS } from "@/lib/plans";
import { runtimeValue } from "@/db";
import AccountHeader from "@/app/account/account-header";

export const dynamic = "force-dynamic";
export const metadata = { title: "מנוי וחיוב | Linkli", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const user = await requireProductUser("/checkout");
  const developmentCheckout = process.env.NODE_ENV === "development";
  const fallbackCheckout = Boolean(runtimeValue("BILLING_CHECKOUT_URL"));
  const availableMethods = ([
    ["card", "BILLING_CREDIT_CARD_URL"],
    ["paypal", "BILLING_PAYPAL_URL"],
    ["bit", "BILLING_BIT_URL"],
  ] as const)
    .filter(([, key]) => developmentCheckout || fallbackCheckout || Boolean(runtimeValue(key)))
    .map(([method]) => method);
  const portalReady = Boolean(runtimeValue("BILLING_PORTAL_URL"));

  return (
    <main className="checkout-shell" id="main-content">
      <AccountHeader displayName={user.displayName} email={user.email} plan={user.plan} />
      <div className="checkout-main">
        <div className="account-hero checkout-account-hero">
          <div className="account-hero-avatar subscription-avatar" aria-hidden="true">✦</div>
          <div>
            <span className="kicker">מנוי וחיוב</span>
            <h1>{user.plan === "plus" ? "המנוי שלכם" : "יותר מקום ליצור"}</h1>
            <p>{user.plan === "plus" ? "כל פרטי המסלול והגישה שלכם במקום אחד." : "בחרו את המסלול שמתאים לקצב היצירה שלכם."}</p>
          </div>
        </div>
        <nav className="settings-tabs" aria-label="הגדרות החשבון">
          <Link href="/account"><span aria-hidden="true">◉</span> פרופיל ואבטחה</Link>
          <Link href="/checkout" className="active" aria-current="page"><span aria-hidden="true">◇</span> מנוי וחיוב</Link>
        </nav>

        {user.plan === "plus" ? (
          <section className="subscription-active">
            <div className="subscription-active-main">
              <div className="subscription-active-topline">
                <span className="subscription-status"><i /> מנוי פעיל</span>
                <span>Linkli Plus</span>
              </div>
              <div className="subscription-active-copy">
                <div>
                  <span>המסלול הנוכחי</span>
                  <h2>Linkli Plus</h2>
                  <p>כל כלי היצירה פתוחים עבורכם — עד {PROJECT_LIMITS.plus} עמודים, כל התבניות וללא מיתוג.</p>
                </div>
                <div className="subscription-price"><strong>₪9.90</strong><span>לחודש</span></div>
              </div>
              <div className="subscription-active-actions">
                <Link href="/studio" className="button button-primary">חזרה לעמודים שלי</Link>
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
              <h2>Plus נותן לכם יותר חופש</h2>
              <ul className="subscription-feature-list">
                <li><span>✓</span><div><b>עד {PROJECT_LIMITS.plus} עמודים</b><small>צרו כמה חוויות במקביל</small></div></li>
                <li><span>✓</span><div><b>כל התבניות והרכיבים</b><small>ללא נעילות או הגבלות עיצוב</small></div></li>
                <li><span>✓</span><div><b>ללא מיתוג Linkli</b><small>העמוד נשאר כולו שלכם</small></div></li>
              </ul>
            </aside>
          </section>
        ) : (
          <>
            <section className="subscription-plan-banner">
              <div>
                <span className="subscription-plan-label">PLUS</span>
                <h2>כל מה שצריך כדי ליצור בלי לעצור</h2>
                <p>עברו מעמוד אחד לסביבת יצירה מלאה, עם כל התבניות וללא מיתוג Linkli.</p>
              </div>
              <div className="subscription-plan-price"><strong>₪9.90</strong><span>לחודש · ביטול בכל עת</span></div>
            </section>
            <div className="checkout-grid">
              <aside className="order-card">
                <span className="checkout-section-label">מה מקבלים</span>
                <h2>הכול פתוח ב־Plus</h2>
                <ul className="subscription-feature-list order-list">
                  <li><span>10</span><div><b>עד 10 עמודים במקביל</b><small>לכל אירוע, קמפיין או רעיון חדש</small></div></li>
                  <li><span>✦</span><div><b>כל התבניות והרכיבים</b><small>כולל ספירה לאחור, Waze ושוברי מתנה</small></div></li>
                  <li><span>✓</span><div><b>עמודים ללא מיתוג</b><small>חוויה נקייה ומקצועית שמתאימה למותג שלכם</small></div></li>
                  <li><span>⌁</span><div><b>פרטיות וערוצי מענה</b><small>הגנת סיסמה, WhatsApp, Telegram ו־DM</small></div></li>
                </ul>
                <div className="order-total"><span>סה״כ לחודש</span><strong>₪9.90</strong></div>
                <p className="order-reassurance">אפשר לבטל את החידוש בכל עת. הגישה נשארת פעילה עד סוף התקופה ששולמה.</p>
              </aside>
              <CheckoutClient email={user.email} availableMethods={availableMethods} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
