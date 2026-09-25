import Link from "next/link";
import DocumentTitle from "./document-title";

export const metadata = {
  title: "העמוד לא נמצא | Linkli",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <main className="published-shell" id="main-content" style={{"--page-soft":"#ffe7eb","--page-accent":"#ef476f"} as React.CSSProperties}><DocumentTitle title="העמוד לא נמצא | Linkli" /><section className="published-card"><div className="published-emoji">🔍</div><h1>העמוד אינו זמין</h1><p className="published-sub">ייתכן שהעמוד הוחזר למצב טיוטה או שכתובתו השתנתה.</p><Link href="/" className="button button-primary">יצירת עמוד חדש</Link></section></main>;
}
