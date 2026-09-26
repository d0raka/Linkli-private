"use client";

import Link from "next/link";
import { useState } from "react";
import { CaretDown, CreditCard, Gear, Lifebuoy, ShieldCheck, SignOut, SquaresFour } from "@phosphor-icons/react/ssr";
import { getPlanName } from "@/lib/plans";
import { Menu } from "@/app/ui/menu";
import { Badge } from "@/app/ui/status";
import type { ShellUser } from "./app-shell";

export default function AccountMenu({ user }: { user: ShellUser }) {
  const [signingOut, setSigningOut] = useState(false);
  const firstName = user.displayName.trim().split(/\s+/)[0] || user.displayName;

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error("logout failed");
      window.location.replace("/");
    } catch {
      setSigningOut(false);
      window.location.reload();
    }
  }

  return (
    <Menu
      className="account-menu"
      label={`תפריט החשבון של ${user.displayName}`}
      trigger={<>
        <span className="ui-avatar" aria-hidden="true">{firstName.slice(0, 1)}</span>
        <span className="account-menu__name">{firstName}</span>
        <CaretDown aria-hidden="true" size="0.9em" weight="bold" />
      </>}
    >
      <div className="account-menu__identity">
        <b>{user.displayName}</b>
        <span dir="ltr">{user.email}</span>
        <Badge tone={user.plan === "free" ? "neutral" : "accent"}>מסלול {getPlanName(user.plan)}</Badge>
      </div>
      <div className="ui-menu__separator" role="separator" />
      <Link className="ui-menu__item account-menu__pages" href="/studio"><SquaresFour aria-hidden="true" />העמודים שלי</Link>
      <Link className="ui-menu__item" href="/account"><Gear aria-hidden="true" />הגדרות חשבון</Link>
      <Link className="ui-menu__item" href="/account#plan"><CreditCard aria-hidden="true" />מסלול וחיוב</Link>
      {user.isAdmin ? <Link className="ui-menu__item" href="/admin"><ShieldCheck aria-hidden="true" />ניהול האתר</Link> : null}
      <Link className="ui-menu__item" href="/contact"><Lifebuoy aria-hidden="true" />עזרה ויצירת קשר</Link>
      <div className="ui-menu__separator" role="separator" />
      <button type="button" className="ui-menu__item" onClick={signOut} disabled={signingOut}>
        <SignOut aria-hidden="true" />{signingOut ? "יוצאים…" : "יציאה"}
      </button>
    </Menu>
  );
}
