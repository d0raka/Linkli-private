import { headers } from "next/headers";
import { getProductUser } from "@/lib/auth";
import { pageLimit } from "@/lib/plans";
import { ensureReferralCode } from "@/lib/referrals";
import { ensureDatabase } from "@/db";
import PaywallClient from "./paywall-client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "מסלולים | Linkli",
  description: "חינם, יוצר, אירוע וארגונים. עמוד מפורסם אחד · טיוטות ללא הגבלה, ומשדרגים כשצריך עוד מקום ואישורי הגעה.",
};

export default async function PaywallPage() {
  const user = await getProductUser();
  if (!user) {
    return (
      <main className="paywall-shell" id="main-content">
        <PaywallClient user={null} startHref="/register?returnTo=%2Fpaywall" />
      </main>
    );
  }
  const db = await ensureDatabase();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "linkli.online";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const referralCode = await ensureReferralCode(db, user.email);

  return (
    <main className="paywall-shell" id="main-content">
      <PaywallClient
        user={{
          plan: user.plan,
          bonusPages: user.bonusPages,
          pageLimit: pageLimit(user.plan, user.bonusPages),
          referralCode,
          referralUrl: referralCode ? `${origin}/?ref=${referralCode}` : "",
        }}
        startHref="/register?returnTo=%2Fpaywall"
      />
    </main>
  );
}
