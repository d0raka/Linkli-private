"use client";

import { useEffect } from "react";
import { REFERRAL_COOKIE, sanitizeReferralCode } from "@/lib/referrals";

export default function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = sanitizeReferralCode(params.get("ref"));
    if (!code) return;
    document.cookie = `${REFERRAL_COOKIE}=${code}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  }, []);
  return null;
}
