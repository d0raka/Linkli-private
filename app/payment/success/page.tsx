import LegalHeader from "@/app/legal-header";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { getBillingStatus } from "@/lib/billing";
import PaymentSuccessClient from "./payment-success-client";

export const metadata = { title: "התשלום הושלם בהצלחה | Linkli" };

export default async function PaymentSuccessPage() {
  const user = await getProductUser();
  const status = user ? await getBillingStatus(await ensureDatabase(), user.email) : null;
  const state = !user ? "signin" : status?.entitled ? "paid" : "processing";
  return (
    <main className="legal-shell" id="main-content">
      <LegalHeader />
      <article className="legal-main">
        <PaymentSuccessClient
          state={state}
          plan={status?.plan || user?.plan || "free"}
          bonusPages={user?.bonusPages || 0}
        />
      </article>
    </main>
  );
}
