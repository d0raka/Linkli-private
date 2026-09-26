import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { getBillingStatus } from "@/lib/billing";
import SiteShell from "@/app/site/site-shell";
import PaymentSuccessClient from "./payment-success-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "סטטוס התשלום | Linkli", robots: { index: false, follow: false } };

export default async function PaymentSuccessPage() {
  const user = await getProductUser();
  const status = user ? await getBillingStatus(await ensureDatabase(), user.email) : null;
  const state = !user ? "signin" : status?.entitled ? "paid" : "processing";
  return (
    <SiteShell>
      <PaymentSuccessClient state={state} plan={status?.plan || user?.plan || "free"} bonusPages={user?.bonusPages || 0} />
    </SiteShell>
  );
}
