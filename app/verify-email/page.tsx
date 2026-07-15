import Link from "next/link";
import { safeReturnTo } from "@/lib/auth";
import VerifyEmailClient from "./verify-email-client";

export const metadata = { title: "אימות כתובת דוא״ל | Linkli", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; sent?: string; delivery?: string; returnTo?: string }> }) {
  const query = await searchParams;
  const token = typeof query.token === "string" && /^[0-9a-f]{64}$/i.test(query.token) ? query.token : "";
  const returnTo = safeReturnTo(query.returnTo);
  return <main className="auth-shell" id="main-content">
    <Link href="/" className="brand auth-brand">Link<span>li</span></Link>
    <section className="auth-layout">
      <div className="auth-message"><span className="kicker">הגנת החשבון</span><h1>מוודאים שזו<br />באמת הכתובת שלך.</h1><p>כדי להיכנס לסביבת העבודה, צריך לאמת את כתובת הדוא״ל באמצעות הקישור ששלחנו.</p><div className="auth-points"><span>✓ פעולה חד־פעמית</span><span>✓ קישור מאובטח</span><span>✓ נדרש לפני הכניסה לסטודיו</span></div></div>
      <div className="auth-card"><h2>אימות כתובת דוא״ל</h2><VerifyEmailClient token={token} sent={query.sent === "1"} deliveryUnavailable={query.delivery === "failed" || query.delivery === "unavailable"} returnTo={returnTo} /></div>
    </section>
  </main>;
}
