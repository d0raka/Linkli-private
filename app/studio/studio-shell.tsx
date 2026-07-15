import Link from "next/link";
import { requireProductUser } from "@/lib/auth";
import StudioClient from "./studio-client";
import LogoutButton from "./logout-button";

export default async function StudioShell({ createMode = false }: { createMode?: boolean }) {
  const returnTo = createMode ? "/studio/create" : "/studio";
  const user = await requireProductUser(returnTo);

  return (
    <main className="studio-body" id="main-content">
      <header className="studio-header">
        <a href="/studio" className="brand" aria-label="חזרה לעמוד הבית של הסטודיו">Link<span>li</span></a>
        <div className="studio-user">
          {user.isAdmin ? <Link href="/admin" className="admin-link">ניהול</Link> : null}
          <Link href="/account" className="account-link">הגדרות</Link>
          <span className="plan-pill">{user.plan === "plus" ? "PLUS" : "FREE"}</span>
          <div><b>{user.displayName}</b><span>{user.email}</span></div>
          <div className="user-avatar">{user.displayName.slice(0, 1)}</div>
          <LogoutButton />
        </div>
      </header>
      <StudioClient
        key={createMode ? "create" : "dashboard"}
        initialName={user.displayName}
        initialMode={createMode ? "templates" : "dashboard"}
      />
    </main>
  );
}
