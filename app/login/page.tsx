import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/app/auth-form";
import { getProductUser, safeReturnTo } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "כניסה | Linkli", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  if (await getProductUser()) redirect("/studio");
  const returnTo = safeReturnTo((await searchParams).returnTo);
  return <main className="auth-shell" id="main-content">
    <Link href="/" className="brand auth-brand"><span>li</span>Link</Link>
    <section className="auth-layout">
      <div className="auth-message"><span className="kicker">טוב שחזרת</span><h1>העמודים שלך<br />מחכים לך.</h1><p>נכנסים וממשיכים ליצור, לערוך ולשתף — בדיוק מהמקום שבו עצרת.</p><div className="auth-points"><span>✓ חיבור מאובטח</span><span>✓ הפרויקטים נשמרים בחשבון</span><span>✓ בלי כרטיס אשראי במסלול החינמי</span></div></div>
      <div className="auth-card"><h2>כניסה ל־Linkli</h2><p>עם כתובת הדוא״ל והסיסמה שלך</p><AuthForm mode="login" returnTo={returnTo} /></div>
    </section>
  </main>;
}
