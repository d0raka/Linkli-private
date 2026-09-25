"use client";

import type { ReactNode } from "react";
import { planLockLabel, type PlanFeatureId, type PlanType } from "@/lib/plans";

export function PlanLockBadge({ feature, plan }: { feature: PlanFeatureId; plan?: string | null }) {
  const label = planLockLabel(feature, plan);
  if (!label) return null;
  return <span className={`plan-lock-badge is-${label.toLowerCase()}`}>{label === "Max" ? "אירוע" : "יוצר"}</span>;
}

export function PlanLockLayer({
  feature,
  plan,
  onUnlock,
  children,
  className = "",
  name,
}: {
  feature: PlanFeatureId;
  plan?: PlanType | string | null;
  onUnlock: (feature: PlanFeatureId) => void;
  children: ReactNode;
  className?: string;
  name?: string;
}) {
  const label = planLockLabel(feature, plan);
  if (!label) return <>{children}</>;
  return (
    <div className={`plan-lock-wrap ${className}`.trim()}>
      {children}
      <button
        type="button"
        className="plan-lock-veil"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onUnlock(feature);
        }}
        aria-label={`${name || "האפשרות"} כלולה במסלול ${label === "Max" ? "אירוע" : "יוצר"}`}
      >
        <PlanLockBadge feature={feature} plan={plan} />
      </button>
    </div>
  );
}

export function PlanLockChip({
  icon,
  title,
  feature,
  plan,
  onUnlock,
}: {
  icon: string;
  title: string;
  feature: PlanFeatureId;
  plan?: PlanType | string | null;
  onUnlock: (feature: PlanFeatureId) => void;
}) {
  const label = planLockLabel(feature, plan);
  if (!label) return null;
  return (
    <button type="button" className="plan-lock-chip" onClick={() => onUnlock(feature)}>
      <span aria-hidden="true">{icon}</span>
      <b>{title}</b>
      <PlanLockBadge feature={feature} plan={plan} />
    </button>
  );
}
