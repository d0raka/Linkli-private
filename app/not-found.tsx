import Link from "next/link";

export default function NotFound() {
  return <main className="published-shell" id="main-content" style={{"--page-soft":"#ffe7eb","--page-accent":"#ef476f"} as React.CSSProperties}><section className="published-card"><div className="published-emoji">🔍</div><h1>העמוד אינו זמין</h1><p className="published-sub">ייתכן שהעמוד הוחזר למצב טיוטה או שכתובתו השתנתה.</p><Link href="/" className="button button-primary">יצירת עמוד חדש</Link></section></main>;
}
