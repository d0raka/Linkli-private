import Link from "next/link";
import { LinkBreak } from "@phosphor-icons/react/ssr";
import { SiteFooter, SiteHeader } from "./site/site-shell";
import DocumentTitle from "./document-title";
import "./site/site.css";

export const metadata = {
  title: "העמוד לא נמצא | Linkli",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="site-shell">
      <DocumentTitle title="העמוד לא נמצא | Linkli" />
      <SiteHeader signedIn={false} />
      <main id="main-content" className="site-main status-page" tabIndex={-1}>
        <span className="status-page__icon" aria-hidden="true"><LinkBreak /></span>
        <h1>העמוד אינו זמין</h1>
        <p>אולי הקישור השתנה, או שהעמוד הוחזר לטיוטה. אם קיבלתם אותו ממישהו, כדאי לבקש ממנו קישור חדש.</p>
        <div className="status-page__actions">
          <Link href="/" className="ui-button" data-variant="primary">לדף הבית</Link>
          <Link href="/contact" className="ui-button">יצירת קשר</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
