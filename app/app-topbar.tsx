"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import LogoutButton from "@/app/studio/logout-button";
import type { PlanType } from "@/lib/plans";
import { planBadgeLabel } from "@/lib/plans";

export const STUDIO_HOME_EVENT = "linkli:studio-home";

function goToStudioHome(event: MouseEvent<HTMLAnchorElement>) {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/studio") return;
  event.preventDefault();
  if (window.location.search) window.history.replaceState({}, "", "/studio");
  window.dispatchEvent(new Event(STUDIO_HOME_EVENT));
}

type AppSection = "studio" | "create" | "account" | "admin";
type StudioIconName = "home" | "plus" | "settings" | "shield" | "help";

function StudioIcon({ name }: { name: StudioIconName }) {
  const paths: Record<StudioIconName, ReactNode> = {
    home: <><path d="M3.5 10.5 12 3l8.5 7.5" /><path d="M5.5 9.5V21h13V9.5M9.5 21v-6h5v6" /></>,
    plus: <><rect x="4" y="4" width="16" height="16" rx="3.5" /><path d="M12 8v8M8 12h8" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.37a1.7 1.7 0 0 0-1 .63 1.7 1.7 0 0 0-.35 1.05V21h-4v-.08A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.23 15a1.7 1.7 0 0 0-.63-1 1.7 1.7 0 0 0-1.05-.35H2.5v-4h.08A1.7 1.7 0 0 0 4.1 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.5 4.23a1.7 1.7 0 0 0 1-.63 1.7 1.7 0 0 0 .35-1.05V2.5h4v.08A1.7 1.7 0 0 0 14.9 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.27 8.5c.17.36.38.7.63 1 .27.3.65.45 1.05.45H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
    shield: <><path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9.2A2.5 2.5 0 1 1 13 11.6c-.8.3-1 1-1 1.9M12 17h.01" /></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function AppTopbar({
  displayName,
  plan,
  isAdmin,
  current,
}: {
  displayName: string;
  plan: PlanType;
  isAdmin?: boolean;
  current: AppSection;
}) {
  const firstName = displayName.trim().split(/\s+/)[0] || displayName;

  return (
    <header className="studio-topbar">
      <div className="studio-topbar-inner">
        <div className="studio-topbar-start">
          <div className="studio-topbar-brand">
            <Link href="/studio" className="brand" aria-label="Linkli — חזרה לסטודיו" onClick={goToStudioHome}>Link<span>li</span></Link>
          </div>
          <nav className="studio-topbar-nav" aria-label="ניווט ראשי באזור האישי">
            <Link href="/studio" className={current === "studio" ? "active" : ""} aria-current={current === "studio" ? "page" : undefined} onClick={goToStudioHome}>
              <StudioIcon name="home" /><b>סטודיו</b>
            </Link>
            <Link href="/studio/create" className={current === "create" ? "active" : ""} aria-current={current === "create" ? "page" : undefined}>
              <StudioIcon name="plus" /><b>יצירת חוויה</b>
            </Link>
          </nav>
        </div>
        <div className="studio-topbar-end">
          <nav className="studio-utility-nav" aria-label="כלים וחשבון">
            <Link href="/contact"><StudioIcon name="help" /><span>עזרה</span></Link>
            <Link href="/account" className={current === "account" ? "active" : ""} aria-current={current === "account" ? "page" : undefined}>
              <StudioIcon name="settings" /><span>הגדרות</span>
            </Link>
            {isAdmin ? (
              <Link href="/admin" className={current === "admin" ? "active" : ""} aria-current={current === "admin" ? "page" : undefined}>
                <StudioIcon name="shield" /><span>ניהול</span>
              </Link>
            ) : null}
          </nav>
          <Link href="/account" className="studio-topbar-account" aria-label={`החשבון של ${displayName}`}>
            <span className="studio-account-avatar">{firstName.slice(0, 1)}</span>
            <span className="studio-account-copy"><b>{displayName}</b><small>החשבון שלי</small></span>
            <span className={`studio-plan-badge ${plan}`}>{planBadgeLabel(plan)}</span>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
