import Link from "next/link";
import LegalHeader from "@/app/legal-header";

export const metadata = { title: "התשלום לא הושלם | Linkli" };

export default function PaymentCancelPage() {
  return <main className="legal-shell" id="main-content"><LegalHeader /><article className="legal-main"><div className="legal-card" style={{textAlign:"center"}}><div style={{fontSize:58}}>💛</div><h1>לא בוצע חיוב</h1><p>אפשר לחזור ולבחור אמצעי תשלום אחר, או להמשיך להשתמש במסלול החינמי.</p><div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}><Link href="/checkout" className="button button-primary">חזרה לתשלום</Link><Link href="/studio" className="button button-outline">המשך בחינם</Link></div></div></article></main>;
}
