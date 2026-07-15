import Link from "next/link";

export default function LegalHeader() {
  return <header className="simple-header"><Link href="/" className="brand">Link<span>li</span></Link><nav aria-label="ניווט משני"><Link href="/studio">הסטודיו שלי</Link><Link href="/contact">יצירת קשר</Link><Link href="/">חזרה לדף הבית</Link></nav></header>;
}
