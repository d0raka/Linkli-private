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
      <div className="auth-message"><span className="kicker">מתחילים בחינם</span><h1>מהרעיון שלך<br />ללינק אמיתי.</h1><p>חשבון אחד שומר את כל העמודים, התבניות והנתונים שלך במקום מסודר.</p><div className="auth-points"><span>✓ עמוד ראשון בחינם</span><span>✓ אין צורך בכרטיס אשראי</span><span>✓ אפשר לשדרג רק כשרוצים</span></div></div>
      <div className="auth-card"><h2>פתיחת חשבון</h2><p>פחות מדקה והסטודיו שלך מוכן</p><AuthForm mode="register" returnTo={returnTo} /></div>
    </section>
  </main>;
}
