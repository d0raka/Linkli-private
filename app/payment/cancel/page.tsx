import Link from "next/link";
import { ArrowCounterClockwise } from "@phosphor-icons/react/ssr";
import SiteShell from "@/app/site/site-shell";

export const metadata = { title: "התשלום לא הושלם | Linkli", robots: { index: false, follow: false } };

export default function PaymentCancelPage() {
  return (
    <SiteShell>
      <section className="status-page">
        <span className="status-page__icon" aria-hidden="true"><ArrowCounterClockwise /></span>
        <h1>התשלום לא הושלם, ולא בוצע חיוב</h1>
        <p>אפשר לנסות שוב, או להמשיך במסלול החינמי. העמודים והטיוטות שלכם נשמרים.</p>
        <div className="status-page__actions">
          <Link href="/pricing" className="ui-button" data-variant="primary">חזרה למסלולים</Link>
          <Link href="/studio" className="ui-button">לעמודים שלי</Link>
        </div>
      </section>
    </SiteShell>
  );
}
