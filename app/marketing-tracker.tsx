"use client";

import { useEffect } from "react";
import type { CampaignAttribution } from "@/lib/marketing";

export default function MarketingTracker({ campaign, templateId }: { campaign: CampaignAttribution; templateId?: string }) {
  const { source, medium, campaign: campaignName, content, term } = campaign;

  useEffect(() => {
    const attribution = { source, medium, campaign: campaignName, content, term };
    const payload = { event: "landing_view", ...attribution, templateId };
    fetch("/api/marketing/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);

    function trackClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("[data-marketing-event]") : null;
      if (!target) return;
      fetch("/api/marketing/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "cta_click", ...attribution, templateId }),
        keepalive: true,
      }).catch(() => undefined);
    }
    document.addEventListener("click", trackClick, { capture: true });
    return () => document.removeEventListener("click", trackClick, { capture: true });
  }, [source, medium, campaignName, content, term, templateId]);

  return null;
}
