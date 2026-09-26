import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "@phosphor-icons/react/ssr";
import { requireProductUser } from "@/lib/auth";
import { availableCheckoutMethods } from "@/lib/billing";
import { PLAN_CATALOG, getPlanName, isPaidPlan, parsePurchasablePlan, planRank } from "@/lib/plans";
import AppShell from "@/app/app-shell/app-shell";
import MarketingWaitlistForm from "@/app/marketing-waitlist-form";
import { PageHeader } from "@/app/ui/status";
import CheckoutClient from "./checkout-client";
import "./checkout.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "תשלום | Linkli", robots: { index: false, follow: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireProductUser("/checkout");
  const params = await searchParams;
  const rawPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const waitlistPlan = PLAN_CATALOG.find((plan) => plan.waitlist && plan.id === rawPlan);
  const requested = parsePurchasablePlan(rawPlan) || "pro";
  const selected = waitlistPlan || PLAN_CATALOG.find((plan) => plan.id === requested)!;
  if (!waitlistPlan && isPaidPlan(user.plan) && planRank(user.plan) >= planRank(selected.id)) redirect("/account#plan");

  return (
    <AppShell user={user} current="account">
      <PageHeader
        title={waitlistPlan ? "מסלול ארגונים נפתח בהדרגה" : `מסלול ${selected.name}`}
        lead={<>{selected.summary} <Link href="/pricing" className="ui-link">השוואת מסלולים</Link></>}
      />
      <div className="checkout-layout">
        <aside className="ui-panel checkout-summary" aria-labelledby="summary-title">
          <div className="ui-panel__section">
            <h2 className="ui-section-title" id="summary-title">מה כלול</h2>
            <ul className="checkout-summary__list">
              {selected.features.map((item) => <li key={item}><Check aria-hidden="true" weight="bold" />{item}</li>)}
            </ul>
          </div>
          <div className="ui-panel__section checkout-summary__total">
            <span>סה״כ</span>
            <b>{selected.price}</b>
            <small>{selected.cadence}</small>
          </div>
          {isPaidPlan(user.plan) ? <div className="ui-panel__section"><p className="ui-hint">היום אתם במסלול {getPlanName(user.plan)}. השדרוג מחליף אותו מיד אחרי התשלום.</p></div> : null}
        </aside>
        {waitlistPlan ? (
          <section className="ui-panel checkout-pay" aria-labelledby="waitlist-title">
            <div className="ui-panel__section">
              <h2 className="ui-section-title" id="waitlist-title">רשימת המתנה</h2>
              <p className="ui-section-lead">השאירו פרטים ונחזור אליכם כשהמסלול יהיה זמין לרכישה.</p>
              <div className="checkout-pay__form"><MarketingWaitlistForm compact defaultEmail={user.email} purpose="business" /></div>
            </div>
          </section>
        ) : (
          <CheckoutClient email={user.email} plan={requested} priceLabel={selected.price} availableMethods={availableCheckoutMethods()} />
        )}
      </div>
    </AppShell>
  );
}
