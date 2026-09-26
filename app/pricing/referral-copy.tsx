"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react/ssr";

export default function ReferralCopy({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("העתיקו את הקישור:", url);
    }
  }
  return (
    <div className="referral-copy">
      <code dir="ltr">{url}</code>
      <button type="button" className="ui-button" data-variant="primary" onClick={copy} aria-live="polite">
        {copied ? <Check aria-hidden="true" weight="bold" /> : <Copy aria-hidden="true" />}
        {copied ? "הועתק" : "העתקת הקישור"}
      </button>
    </div>
  );
}
