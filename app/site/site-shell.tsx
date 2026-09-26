import Link from "next/link";
import type { ReactNode } from "react";
import { getProductUser } from "@/lib/auth";
import LandingNav from "@/app/landing-nav";
import { Brand } from "@/app/ui/status";
import "./site.css";

export function SiteHeader({ signedIn, loginHref, startHref }: { signedIn: boolean; loginHref?: string; startHref?: string }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Brand href="/" />
        <LandingNav signedIn={signedIn} loginHref={loginHref} startHref={startHref} />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Brand href="/" />
          <p>עמודים קטנים לרגעים גדולים. נשלחים בוואטסאפ, נפתחים בכל טלפון.</p>
        </div>
        <nav aria-label="קישורי מידע">
          <Link href="/pricing">מסלולים</Link>
          <Link href="/legal">תנאים ופרטיות</Link>
          <Link href="/accessibility">הצהרת נגישות</Link>
          <Link href="/contact">יצירת קשר</Link>
        </nav>
      </div>
    </footer>
  );
}

/** Public page frame: site header, one main landmark, footer. */
export default async function SiteShell({ children, className = "", loginHref, startHref }: { children: ReactNode; className?: string; loginHref?: string; startHref?: string }) {
  const user = await getProductUser();
  return (
    <div className={`site-shell ${className}`.trim()}>
      <SiteHeader signedIn={Boolean(user)} loginHref={loginHref} startHref={startHref} />
      <main id="main-content" className="site-main" tabIndex={-1}>{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Long-form content pages (legal, accessibility statement). */
export function ContentPage({ title, updated, lead, children }: { title: string; updated?: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <article className="content-page ui-container" data-size="narrow">
      <header className="content-page__header">
        <h1>{title}</h1>
        {updated ? <p className="content-page__updated">עודכן לאחרונה: {updated}</p> : null}
        {lead ? <div className="content-page__lead">{lead}</div> : null}
      </header>
      <div className="ui-prose">{children}</div>
    </article>
  );
}
