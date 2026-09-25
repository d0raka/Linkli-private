"use client";

import { useState } from "react";
import PaywallOverlay from "./paywall-overlay";
import type { PlanType } from "@/lib/plans";

export default function LandingPlanButton({
  email,
  currentPlan,
  planId,
  featured,
  label,
}: {
  email: string;
  currentPlan: PlanType;
  planId: PlanType;
  featured?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={`button ${featured ? "button-primary" : "button-outline"}`} onClick={() => setOpen(true)}>
        {label}
      </button>
      <PaywallOverlay
        open={open}
        onClose={() => setOpen(false)}
        currentPlan={currentPlan}
        email={email}
        feature="browse"
        highlightPlan={planId === "free" ? undefined : planId}
      />
    </>
  );
}
