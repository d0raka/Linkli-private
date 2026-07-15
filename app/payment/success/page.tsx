import Link from "next/link";
import LegalHeader from "@/app/legal-header";

export const metadata = { title: "התשלום התקבל | Linkli" };

export default function PaymentSuccessPage() {
  return <main className="legal-shell" id="main-content"><LegalHeader /><article className="legal-main"><div className="legal-card" style={{textAlign:"center"}}><div style={{fontSize:64}}>🎉</div><h1>ברוכים הבאים ל־Plus</h1><p>לאחר שספק התשלום יאשר את העסקה, החשבון יתעדכן אוטומטית וכל תכונות Plus ייפתחו.</p><Link href="/studio" className="button button-primary">כניסה לסטודיו</Link></div></article></main>;
}
