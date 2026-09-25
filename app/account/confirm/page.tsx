import Link from "next/link";
import { peekAuthToken } from "@/lib/account-security";
import ConfirmClient from "@/app/account/confirm/confirm-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "אישור פעולה | Linkli", robots: { index: false, follow: false } };

export default async function AccountConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  const record = await peekAuthToken(token);
  const purpose = record && (record.purpose === "change_password" || record.purpose === "delete_account") ? record.purpose : null;
  const valid = Boolean(purpose);

  return (
    <main className="account-shell account-confirm-shell" id="main-content">
      <header className="studio-header account-header">
        <Link href="/studio" className="brand" aria-label="חזרה לסטודיו">Link<span>li</span></Link>
      </header>
      <section className="account-confirm-main">
        {!valid || !record || !purpose ? (
          <div className="account-confirm-card">
            <span className="account-kicker">הקישור לא תקף</span>
            <h1>אי אפשר להשלים את הפעולה</h1>
            <p>הקישור חסר, פג תוקפו או שכבר נעשה בו שימוש. אפשר לחזור להגדרות ולבקש קישור חדש.</p>
            <Link href="/account" className="button button-primary">חזרה להגדרות</Link>
          </div>
        ) : (
          <ConfirmClient token={token} purpose={purpose} email={record.email} />
        )}
      </section>
    </main>
  );
}
