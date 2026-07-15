import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/app/auth-form";
import { getProductUser, safeReturnTo } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "הרשמה | Linkli", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  if (await getProductUser()) redirect("/studio");
  const returnTo = safeReturnTo((await searchParams).returnTo);
  return <main className="auth-shell" id="main-content">
    <Link href="/" className="brand auth-brand">Link<span>li</span></Link>
    <section className="auth-layout">
      <div className="auth-message"><span className="kicker">מתחילים בחינם</span><h1>מרעיון ראשוני<br />לעמוד שאפשר לשתף.</h1><p>חשבון אחד מרכז את כל העמודים, התבניות ונתוני הפעילות במקום מסודר.</p><div className="auth-points"><span>✓ עמוד ראשון בחינם</span><span>✓ אין צורך בכרטיס אשראי</span><span>✓ אימות דוא״ל מאובטח</span></div></div>
      <div className="auth-card"><h2>פתיחת חשבון</h2><p>לאחר ההרשמה נשלח אליך קישור לאימות כתובת הדוא״ל.</p><AuthForm mode="register" returnTo={returnTo} /></div>
    </section>
  </main>;
}
