import Link from "next/link";
import { requireProductUser } from "@/lib/auth";
import AccountClient from "./account-client";
import AccountHeader from "./account-header";

export const dynamic = "force-dynamic";
export const metadata = { title: "הפרופיל שלי | Linkli", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await requireProductUser("/account");

  return (
    <main className="account-shell" id="main-content">
      <AccountHeader displayName={user.displayName} email={user.email} plan={user.plan} />
      <section className="account-main">
        <div className="account-hero">
          <div className="account-hero-avatar" aria-hidden="true">{user.displayName.slice(0, 1)}</div>
          <div>
            <span className="kicker">החשבון שלי</span>
            <h1>שלום, {user.displayName}</h1>
            <p>כאן אפשר לעדכן את הפרופיל, פרטי הכניסה והמנוי.</p>
          </div>
        </div>
        <nav className="settings-tabs" aria-label="הגדרות החשבון">
          <Link href="/account" className="active" aria-current="page">
            <span aria-hidden="true">◉</span> פרופיל ואבטחה
          </Link>
          <Link href="/checkout">
            <span aria-hidden="true">◇</span> מנוי וחיוב
          </Link>
        </nav>
        <AccountClient
          email={user.email}
          initialName={user.displayName}
          emailVerified={user.emailVerified}
          plan={user.plan}
        />
      </section>
    </main>
  );
}
