import Link from "next/link";
import { getProductUser } from "@/lib/auth";

export default async function LegalHeader() {
  const user = await getProductUser();
  return <header className="simple-header"><Link href={user ? "/studio" : "/"} className="brand">Link<span>li</span></Link><nav aria-label="ניווט משני"><Link href="/studio">העמודים שלי</Link><Link href="/contact">יצירת קשר</Link><Link href="/">חזרה לדף הבית</Link></nav></header>;
}
