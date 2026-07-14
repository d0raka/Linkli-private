import Link from "next/link";

export default function NotFound() {
  return <main className="published-shell" style={{"--page-soft":"#ffe7eb","--page-accent":"#ef476f"} as React.CSSProperties}><section className="published-card"><div className="published-emoji">🔍</div><h1>הלינק הזה לא באוויר</h1><p className="published-sub">יכול להיות שהעמוד הוסר או שהכתובת השתנתה.</p><Link href="/" className="button button-primary">יצירת עמוד חדש</Link></section></main>;
}
