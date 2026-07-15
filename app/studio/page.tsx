import Link from "next/link";
import { requireProductUser } from "@/lib/auth";
import StudioClient from "./studio-client";
import LogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const user = await requireProductUser("/studio");
  return (
    <main className="studio-body" id="main-content">
      <header className="studio-header">
        <Link href="/" className="brand"><span>li</span>Link</Link>
        <div className="studio-user">
          {user.isAdmin ? <Link href="/admin" className="admin-link">ניהול</Link> : null}
          <span className="plan-pill">{user.plan === "plus" ? "PLUS" : "FREE"}</span>
          <div><b>{user.displayName}</b><span>{user.email}</span></div>
          <div className="user-avatar">{user.displayName.slice(0, 1)}</div>
          <LogoutButton />
        </div>
      </header>
      <StudioClient initialName={user.displayName} />
    </main>
  );
}
