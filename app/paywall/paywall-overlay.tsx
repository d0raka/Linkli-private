"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CheckoutClient from "@/app/checkout/checkout-client";
import MarketingWaitlistForm from "@/app/marketing-waitlist-form";
import { FOCUSABLE_SELECTOR, wrapFocusIndex } from "@/lib/a11y";
import {
  PLAN_CATALOG,
  getPlanName,
  hasPlanAccess,
  paywallCopy,
  planRank,
  requiredPlanForFeature,
  type PaidPlanType,
  type PlanFeatureId,
  type PlanType,
} from "@/lib/plans";

type PaymentMethod = "card" | "paypal" | "bit";

type DialogProps = {
  onClose: () => void;
  currentPlan: PlanType;
  email: string;
  feature: PlanFeatureId;
  suggested: PaidPlanType;
  availableMethods: PaymentMethod[];
};

export default function PaywallOverlay({
  open,
  onClose,
  currentPlan,
  email,
  feature = "browse",
  highlightPlan,
  availableMethods = [],
}: {
  open: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  email: string;
  feature?: PlanFeatureId | null;
  highlightPlan?: PaidPlanType;
  availableMethods?: PaymentMethod[];
}) {
  const resolvedFeature = feature || "browse";
  const suggested = highlightPlan || requiredPlanForFeature(resolvedFeature);
  if (!open) return null;
  // Keyed by the suggested plan so every open (or feature change) starts on the plans step.
  return <PaywallDialog key={`${resolvedFeature}:${suggested}`} onClose={onClose} currentPlan={currentPlan} email={email} feature={resolvedFeature} suggested={suggested} availableMethods={availableMethods} />;
}

function PaywallDialog({ onClose, currentPlan, email, feature, suggested, availableMethods }: DialogProps) {
  const copy = paywallCopy(feature);
  const [step, setStep] = useState<"plans" | "checkout" | "waitlist">("plans");
  const [selected, setSelected] = useState<PaidPlanType>(suggested);
  const dialogRef = useRef<HTMLDivElement>(null);
  const paidPlans = useMemo(
    () => PLAN_CATALOG.filter((plan) => plan.id !== "free" && (plan.waitlist || planRank(plan.id) >= planRank(suggested))),
    [suggested],
  );
  const selectedPlan = paidPlans.find((plan) => plan.id === selected) || paidPlans[0];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    document.body.style.overflow = "hidden";
    const focusables = () => [...(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) || [])].filter((node) => !node.hasAttribute("disabled"));
    focusables()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const nodes = focusables();
      if (!nodes.length) return;
      const current = nodes.findIndex((node) => node === document.activeElement);
      event.preventDefault();
      nodes[wrapFocusIndex(current === -1 ? 0 : current, event.shiftKey ? -1 : 1, nodes.length)].focus();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  function pickPlan(planId: PlanType) {
    if (planId === "free" || hasPlanAccess(currentPlan, planId)) {
      onClose();
      return;
    }
    const catalog = PLAN_CATALOG.find((plan) => plan.id === planId);
    setSelected(planId === "business" || planId === "max" || planId === "pro" ? planId : suggested);
    setStep(catalog?.waitlist ? "waitlist" : "checkout");
  }

  return (
    <div className="paywall-overlay" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="paywall-overlay-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-overlay-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="paywall-overlay-close" onClick={onClose} aria-label="סגירה">×</button>
        {step === "checkout" || step === "waitlist" ? (
          <button type="button" className="paywall-overlay-back" onClick={() => setStep("plans")}>
            <span aria-hidden="true">→</span> חזרה למסלולים
          </button>
        ) : null}
        <span className="kicker">{step === "plans" ? "שדרוג לפי הצורך" : selectedPlan.name}</span>
        <h2 id="paywall-overlay-title">{step === "checkout" ? `תשלום ל-${selectedPlan.name}` : step === "waitlist" ? "רשימת המתנה ל-Business" : copy.title}</h2>
        <p>{step === "checkout" ? selectedPlan.summary : step === "waitlist" ? selectedPlan.summary : copy.body}</p>
        <p className="paywall-overlay-current">המסלול אצלך עכשיו: <b>{getPlanName(currentPlan)}</b></p>

        {step === "plans" ? (
          <div className="paywall-overlay-grid" aria-label="מסלולי Linkli">
            {paidPlans.map((plan) => {
              const current = currentPlan === plan.id;
              const recommended = plan.id === suggested && !hasPlanAccess(currentPlan, suggested);
              return (
                <article className={`paywall-card ${plan.featured ? "is-featured" : ""} ${current ? "is-current" : ""} ${recommended ? "is-recommended" : ""}`} key={plan.id}>
                  {recommended ? <span className="paywall-ribbon">מתאים למה שבחרת</span> : plan.featured ? <span className="paywall-ribbon">הבחירה ליצירה</span> : null}
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
                    <button type="button" className={`button ${recommended || plan.featured ? "button-primary" : "button-outline"}`} onClick={() => pickPlan(plan.id)}>
                      {plan.waitlist ? "להרשמה מוקדמת" : hasPlanAccess(currentPlan, plan.id) ? `כלול אצלך ב-${getPlanName(currentPlan)}` : `בחירת ${plan.name}`}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : step === "waitlist" ? (
          <div className="paywall-overlay-checkout">
            <MarketingWaitlistForm compact defaultEmail={email} />
          </div>
        ) : (
          <div className="paywall-overlay-checkout">
            <CheckoutClient email={email} plan={selected === "max" ? "max" : "pro"} priceLabel={selectedPlan.price} availableMethods={availableMethods} embedded />
          </div>
        )}

        <button type="button" className="paywall-overlay-dismiss" onClick={onClose}>להישאר במסלול הנוכחי</button>
      </div>
    </div>
  );
}
