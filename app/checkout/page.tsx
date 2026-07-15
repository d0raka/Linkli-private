import Link from "next/link";
import { requireProductUser } from "@/lib/auth";
import LegalHeader from "@/app/legal-header";
import CheckoutClient from "./checkout-client";
import { templates } from "@/lib/templates";
import { PROJECT_LIMITS } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata = { title: "שדרוג ל־Plus | Linkli" };

export default async function CheckoutPage() {
  const user = await requireProductUser("/checkout");
  return <main className="checkout-shell" id="main-content"><LegalHeader /><div className="checkout-main">
    <div className="checkout-heading"><span className="kicker">יותר מקום ליצור</span><h1>שדרוג ל־Linkli Plus</h1><p>₪9.90 בחודש · אפשר לבטל את החידוש בכל עת</p></div>
    {user.plan === "plus" ? <section className="legal-card" style={{textAlign:"center"}}><div style={{fontSize:55}}>🎉</div><h2>Plus כבר פעיל בחשבון שלכם</h2><p>אפשר ליצור עד {PROJECT_LIMITS.plus} עמודים, להשתמש בכל {templates.length} התבניות ולפרסם ללא מיתוג Linkli.</p><Link href="/studio" className="button button-primary">חזרה לעמודים שלי</Link></section> : <div className="checkout-grid">
      <aside className="order-card"><h2>מה כולל Plus?</h2><div className="plan-summary"><div><b>Linkli Plus</b><strong>₪9.90</strong></div><small>חיוב חודשי מתחדש</small></div><ul className="order-list"><li>✓ עד {PROJECT_LIMITS.plus} עמודים</li><li>✓ כל {templates.length} התבניות, כולל תבניות חדשות</li><li>✓ עמודים ללא מיתוג Linkli</li><li>✓ כל כלי העריכה, הנתונים והגנת הסיסמה</li></ul><div className="order-total"><span>סה״כ לחודש</span><span>₪9.90</span></div></aside>
      <CheckoutClient email={user.email} />
    </div>}
  </div></main>;
}
