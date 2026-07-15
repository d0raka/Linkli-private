import Link from "next/link";
import { safeReturnTo } from "@/lib/auth";
import VerifyEmailClient from "./verify-email-client";

export const metadata = { title: "אימות כתובת דוא״ל | Linkli", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; sent?: string; returnTo?: string }> }) {
  const query = await searchParams;
  const token = typeof query.token === "string" && /^[0-9a-f]{64}$/i.test(query.token) ? query.token : "";
  const returnTo = safeReturnTo(query.returnTo);
  return <main className="auth-shell" id="main-content">
    <Link href="/" className="brand auth-brand">Link<span>li</span></Link>
    <section className="auth-layout">
      <div className="auth-message"><span className="kicker">הגנת החשבון</span><h1>מוודאים שזו<br />באמת הכתובת שלך.</h1><p>אימות הדוא״ל מסייע לנו להגן על החשבון ולאפשר שחזור גישה במקרה הצורך.</p><div className="auth-points"><span>✓ פעולה חד־פעמית</span><span>✓ קישור מאובטח</span><span>✓ אפשר להמשיך לעבוד בינתיים</span></div></div>
      <div className="auth-card"><h2>אימות כתובת דוא״ל</h2><VerifyEmailClient token={token} sent={query.sent === "1"} returnTo={returnTo} /></div>
    </section>
  </main>;
}
