import Link from "next/link";
import ResetPasswordForm from "./reset-password-form";

export const metadata = { title: "בחירת סיסמה חדשה | Linkli", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token || "";
  return <main className="auth-shell" id="main-content">
    <Link href="/" className="brand auth-brand">Link<span>li</span></Link>
    <section className="auth-layout">
      <div className="auth-message"><span className="kicker">אבטחת החשבון</span><h1>בוחרים סיסמה<br />חדשה וחזקה.</h1><p>לאחר העדכון, כל החיבורים הקודמים לחשבון ינותקו ותיכנסו מחדש באופן מאובטח.</p><div className="auth-points"><span>✓ לפחות 15 תווים</span><span>✓ קישור חד־פעמי</span><span>✓ החיבורים הישנים מתבטלים</span></div></div>
      <div className="auth-card"><h2>בחירת סיסמה חדשה</h2><p>הסיסמה החדשה צריכה להיות שונה מהקודמת.</p><ResetPasswordForm token={token} /></div>
    </section>
  </main>;
}
