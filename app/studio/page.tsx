import Link from "next/link";
import { ensureUserRecord, requireProductUser } from "@/app/chatgpt-auth";
import StudioClient from "./studio-client";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const user = await requireProductUser("/studio");
  const profile = await ensureUserRecord(user) as any;
  return (
    <main className="studio-body" id="main-content">
      <header className="studio-header">
        <Link href="/" className="brand"><span>li</span>Link</Link>
        <div className="studio-user">
          <span className="plan-pill">{profile.plan === "plus" ? "PLUS" : "FREE"}</span>
          <div><b>{user.displayName}</b><span>{user.email}</span></div>
          <div className="user-avatar">{user.displayName.slice(0, 1)}</div>
        </div>
      </header>
      <StudioClient initialName={user.displayName} />
    </main>
  );
}
