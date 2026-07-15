import Link from "next/link";
import ForgotPasswordForm from "./forgot-password-form";

export const metadata = { title: "איפוס סיסמה | Linkli", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <main className="auth-shell" id="main-content">
    <Link href="/" className="brand auth-brand">Link<span>li</span></Link>
    <section className="auth-layout">
      <div className="auth-message"><span className="kicker">חוזרים לחשבון</span><h1>איפוס סיסמה<br />בכמה רגעים.</h1><p>הזינו את כתובת הדוא״ל של החשבון. אם הכתובת רשומה, נשלח אליה קישור מאובטח לבחירת סיסמה חדשה.</p><div className="auth-points"><span>✓ קישור חד־פעמי</span><span>✓ תוקף של 30 דקות</span><span>✓ ניתוק אוטומטי של חיבורים קודמים</span></div></div>
      <div className="auth-card"><h2>שכחת את הסיסמה?</h2><p>נשלח הוראות לכתובת הרשומה בחשבון.</p><ForgotPasswordForm /></div>
    </section>
  </main>;
}
