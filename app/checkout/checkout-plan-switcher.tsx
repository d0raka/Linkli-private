"use client";

import { useState } from "react";
import PaywallOverlay from "@/app/paywall/paywall-overlay";
import type { PlanType } from "@/lib/plans";

export default function CheckoutPlanSwitcher({
  currentPlan,
  email,
  label,
  variant = "button",
}: {
  currentPlan: PlanType;
  email: string;
  label: string;
  variant?: "button" | "link";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={variant === "link" ? "paywall-inline-link" : "button button-outline"}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <PaywallOverlay open={open} onClose={() => setOpen(false)} currentPlan={currentPlan} email={email} feature="browse" />
    </>
  );
}
