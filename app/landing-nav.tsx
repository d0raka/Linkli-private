"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingNav({
  homeHref,
  startHref,
  loginHref,
  signedIn,
  pricingHref,
}: {
  homeHref: string;
  startHref: string;
  loginHref: string;
  signedIn: boolean;
  pricingHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <nav className={`topbar wrap ${open ? "is-nav-open" : ""}`} aria-label="ניווט ראשי">
      <Link href={homeHref} className="brand">Link<span>li</span></Link>
      <button
        type="button"
        className="nav-menu-toggle"
        aria-expanded={open}
        aria-controls="landing-nav-links"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "סגירת תפריט" : "תפריט"}
      </button>
      <div className="nav-links" id="landing-nav-links">
        <a href="#templates">תבניות</a>
        <Link href={pricingHref}>מסלולים</Link>
        {signedIn
          ? <Link className="button button-small button-dark" href="/studio">לעמודים שלי</Link>
          : <><Link href={loginHref}>כניסה</Link><Link data-marketing-event="signup_nav" className="button button-small button-dark" href={startHref}>הרשמה חינם</Link></>}
      </div>
    </nav>
  );
}
