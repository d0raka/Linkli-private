import Link from "next/link";
import { Check, Minus } from "@phosphor-icons/react/ssr";
import { PLAN_CATALOG, hasPlanAccess, type PlanType } from "@/lib/plans";

/** Plan comparison used by the landing page and /pricing. Links go straight to the next real step. */
export default function PlanColumns({ signedIn, currentPlan = "free", startHref }: { signedIn: boolean; currentPlan?: PlanType; startHref: string }) {
  return (
    <ul className="plan-columns" aria-label="מסלולי Linkli">
      {PLAN_CATALOG.map((plan) => {
        const current = signedIn && currentPlan === plan.id;
        const covered = signedIn && plan.id !== "free" && hasPlanAccess(currentPlan, plan.id) && !current;
        const href = plan.id === "free"
          ? startHref
          : signedIn
            ? `/checkout?plan=${plan.id}`
            : `/register?returnTo=${encodeURIComponent(`/checkout?plan=${plan.id}`)}`;
        const label = plan.id === "free" ? (signedIn ? "לעמודים שלי" : "מתחילים בחינם") : plan.waitlist ? "השארת פרטים" : `בחירת ${plan.name}`;
        return (
          <li key={plan.id} className="plan-column" data-featured={plan.featured ? "" : undefined}>
            <div className="plan-column__head">
              <h3>{plan.name}</h3>
              {plan.featured ? <span className="ui-badge" data-tone="accent">הכי נבחר</span> : null}
            </div>
            <p className="plan-column__price"><b>{plan.price}</b><span>{plan.cadence}</span></p>
            <p className="plan-column__summary">{plan.summary}</p>
            <ul className="plan-column__features">
              {plan.features.map((item) => <li key={item}><Check aria-hidden="true" weight="bold" />{item}</li>)}
              {plan.blocked.map((item) => <li key={item} className="is-muted"><Minus aria-hidden="true" weight="bold" />{item}</li>)}
            </ul>
            <div className="plan-column__action">
              {current ? (
                <span className="plan-column__current">המסלול שלך</span>
              ) : covered ? (
                <span className="plan-column__current">כלול במסלול שלך</span>
              ) : (
                <Link className="ui-button" data-variant={plan.featured ? "primary" : undefined} data-block="" href={href}>{label}</Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
