import Link from "next/link";
import LegalHeader from "@/app/legal-header";
import { PROJECT_LIMITS } from "@/lib/plans";

export const metadata = { title: "התשלום נשלח לאישור | Linkli" };

export default function PaymentSuccessPage() {
  return <main className="legal-shell" id="main-content"><LegalHeader /><article className="legal-main"><div className="legal-card" style={{textAlign:"center"}}><div style={{fontSize:64}}>🕐</div><h1>התשלום נשלח לאישור</h1><p>קיבלנו את החזרה מספק התשלום. לאחר שהאישור ייקלט במערכת, Plus יופעל ויאפשר ליצור עד {PROJECT_LIMITS.plus} עמודים, להשתמש בכל התבניות ולפרסם ללא מיתוג.</p><Link href="/studio" className="button button-primary">לעמודים שלי</Link></div></article></main>;
}
