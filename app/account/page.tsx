import Link from "next/link";
import { requireProductUser } from "@/lib/auth";
import LogoutButton from "@/app/studio/logout-button";
import AccountClient from "./account-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "הגדרות חשבון | Linkli", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await requireProductUser("/studio");
  return <main className="studio-body" id="main-content">
    <header className="studio-header">
      <Link href="/studio" className="brand">Link<span>li</span></Link>
      <div className="studio-user"><Link href="/studio" className="account-link">חזרה לסטודיו</Link><span className="plan-pill">{user.plan === "plus" ? "PLUS" : "FREE"}</span><div><b>{user.displayName}</b><span>{user.email}</span></div><div className="user-avatar">{user.displayName.slice(0, 1)}</div><LogoutButton /></div>
    </header>
    <section className="account-main"><div className="studio-title-row"><div><span className="kicker">החשבון שלי</span><h1>הגדרות חשבון</h1><p>עדכון פרטים, אימות כתובת דוא״ל וניהול הסיסמה.</p></div></div><AccountClient email={user.email} initialName={user.displayName} emailVerified={user.emailVerified} /></section>
  </main>;
}
