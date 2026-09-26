"use client";

import Link from "next/link";
import { Check } from "@phosphor-icons/react/ssr";
import { Dialog } from "@/app/ui/dialog";
import "./paywall.css";
import { PLAN_CATALOG, getPlanName, hasPlanAccess, paywallCopy, planRank, requiredPlanForFeature, type PaidPlanType, type PlanFeatureId, type PlanType } from "@/lib/plans";

/**
 * Explains why a feature is locked and offers the plans that unlock it. Choosing a plan goes to
 * /checkout, where the server knows which payment methods are actually configured.
 */
export default function PaywallOverlay({
  open,
  onClose,
  currentPlan,
  feature = "browse",
  highlightPlan,
}: {
  open: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  email?: string;
  feature?: PlanFeatureId | null;
  highlightPlan?: PaidPlanType;
}) {
  const resolved = feature || "browse";
  const suggested = highlightPlan || requiredPlanForFeature(resolved);
  const copy = paywallCopy(resolved);
  const plans = PLAN_CATALOG.filter((plan) => plan.id !== "free" && (plan.waitlist || planRank(plan.id) >= planRank(suggested)));

  return (
    <Dialog open={open} onClose={onClose} title={copy.title} description={copy.body} size="lg" className="paywall">
      <p className="paywall__current">המסלול שלכם עכשיו: <b>{getPlanName(currentPlan)}</b></p>
      <ul className="paywall__plans">
        {plans.map((plan) => {
          const covered = hasPlanAccess(currentPlan, plan.id);
          const recommended = plan.id === suggested && !covered;
          return (
            <li key={plan.id} className="paywall__plan" data-recommended={recommended ? "" : undefined}>
              <div className="paywall__plan-head">
                <h3>{plan.name}</h3>
                {recommended ? <span className="ui-badge" data-tone="accent">מתאים למה שבחרתם</span> : null}
              </div>
              <p className="paywall__price"><b>{plan.price}</b><span>{plan.cadence}</span></p>
              <ul className="paywall__features">
                {plan.features.slice(0, 4).map((item) => <li key={item}><Check aria-hidden="true" weight="bold" />{item}</li>)}
              </ul>
              {covered ? (
                <span className="paywall__covered">כלול במסלול שלכם</span>
              ) : (
                <Link className="ui-button" data-variant={recommended ? "primary" : undefined} data-block="" href={`/checkout?plan=${plan.id}`} onClick={onClose}>
                  {plan.waitlist ? "השארת פרטים" : `מעבר ל${plan.name}`}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
