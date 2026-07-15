import Link from "next/link";
import { requireProductUser } from "@/lib/auth";
import LegalHeader from "@/app/legal-header";
import CheckoutClient from "./checkout-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "שדרוג ל־Plus | Linkli" };

export default async function CheckoutPage() {
  const user = await requireProductUser("/checkout");
  return <main className="checkout-shell" id="main-content"><LegalHeader /><div className="checkout-main">
    <div className="checkout-heading"><span className="kicker">עוד רגע כל התבניות פתוחות</span><h1>שדרוג ל־Linkli Plus</h1><p>₪9.90 בחודש · אפשר לבטל את החידוש בכל עת</p></div>
    {user.plan === "plus" ? <section className="legal-card" style={{textAlign:"center"}}><div style={{fontSize:55}}>🎉</div><h2>כבר יש לך Plus</h2><p>כל התבניות, ללא סימן מים ועד 10 עמודים מפורסמים כבר פתוחים עבורך.</p><Link href="/studio" className="button button-primary">חזרה לסטודיו</Link></section> : <div className="checkout-grid">
      <aside className="order-card"><h2>סיכום ההזמנה</h2><div className="plan-summary"><div><b>Linkli Plus</b><strong>₪9.90</strong></div><small>חיוב חודשי מתחדש</small></div><ul className="order-list"><li>✓ עד 10 עמודים שפורסמו</li><li>✓ כל התבניות הקיימות והחדשות</li><li>✓ ללא סימן מים</li><li>✓ נתוני צפייה ולחיצות</li></ul><div className="order-total"><span>סה״כ לחודש</span><span>₪9.90</span></div></aside>
      <CheckoutClient email={user.email} />
    </div>}
  </div></main>;
}
