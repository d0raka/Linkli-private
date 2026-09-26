import Link from "next/link";
import type { ReactNode } from "react";
import { Plus } from "@phosphor-icons/react/ssr";
import type { PlanType } from "@/lib/plans";
import { ButtonLink } from "@/app/ui/button";
import { Brand } from "@/app/ui/status";
import { ToastProvider } from "@/app/ui/toast";
import AccountMenu from "./account-menu";
import "./app-shell.css";

export type AppSection = "pages" | "account" | "admin" | "none";

export type ShellUser = { displayName: string; email: string; plan: PlanType; isAdmin: boolean };

export default function AppShell({
  user,
  current = "none",
  width = "default",
  children,
}: {
  user: ShellUser;
  current?: AppSection;
  width?: "default" | "wide" | "full";
  children: ReactNode;
}) {
  return (
    <div className="app-shell" data-width={width}>
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__start">
            <Brand href="/studio" label="Linkli, לעמודים שלי" />
            <nav className="app-nav" aria-label="ניווט ראשי">
              <Link href="/studio" aria-current={current === "pages" ? "page" : undefined}>העמודים שלי</Link>
              {user.isAdmin ? <Link href="/admin" aria-current={current === "admin" ? "page" : undefined}>ניהול</Link> : null}
            </nav>
          </div>
          <div className="app-header__end">
            <ButtonLink href="/studio/create" variant="primary" size="sm" icon={<Plus aria-hidden="true" weight="bold" />} className="app-header__create" aria-label="יצירת עמוד חדש">
              <span className="app-header__create-label">עמוד חדש</span>
            </ButtonLink>
            <AccountMenu user={user} />
          </div>
        </div>
      </header>
      <main id="main-content" className="app-main" tabIndex={-1}>
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
}
