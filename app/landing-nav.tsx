"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { List, X } from "@phosphor-icons/react/ssr";

/** Public site navigation. On phones the links collapse behind a labeled menu button. */
export default function LandingNav({ signedIn, loginHref = "/login", startHref = "/create/birthday" }: { signedIn: boolean; loginHref?: string; startHref?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <nav className={`site-nav ${open ? "is-open" : ""}`} aria-label="ניווט ראשי">
      <button
        type="button"
        className="site-nav__toggle"
        aria-expanded={open}
        aria-controls="landing-nav-links"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden="true" /> : <List aria-hidden="true" />}
        <span>{open ? "סגירת תפריט" : "תפריט"}</span>
      </button>
      <div className="site-nav__links" id="landing-nav-links" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
        <Link href="/#templates">תבניות</Link>
        <Link href="/pricing" aria-current={pathname === "/pricing" ? "page" : undefined}>מסלולים</Link>
        <Link href="/#faq">שאלות נפוצות</Link>
        <span className="site-nav__divider" aria-hidden="true" />
        {signedIn ? (
          <Link className="ui-button" data-variant="primary" data-size="sm" href="/studio">העמודים שלי</Link>
        ) : (
          <>
            <Link href={loginHref}>כניסה</Link>
            <Link data-marketing-event="signup_nav" className="ui-button" data-variant="primary" data-size="sm" href={startHref}>מתחילים בחינם</Link>
          </>
        )}
      </div>
    </nav>
  );
}
