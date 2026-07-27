import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/app/auth-form";
import { getProductUser, safeReturnTo } from "@/lib/auth";
import { campaignFromObject } from "@/lib/marketing";

export const dynamic = "force-dynamic";
export const metadata = { title: "כניסה | Linkli", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getProductUser()) redirect("/studio");
  const rawParams = await searchParams;
  const query = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] || "" : value || ""]));
  const returnTo = safeReturnTo(query.returnTo);
  const campaign = campaignFromObject(query);
  return <main className="auth-shell" id="main-content">
    <Link href="/" className="brand auth-brand">Link<span>li</span></Link>
    <section className="auth-layout">
      <div className="auth-message"><span className="kicker">טוב שחזרתם</span><h1>העמודים שלכם<br />מחכים לכם.</h1><p>נכנסים וממשיכים ליצור, לערוך ולשתף — בדיוק מהמקום שבו עצרתם.</p><div className="auth-points"><span>✓ כניסה מאובטחת</span><span>✓ העמודים נשמרים בחשבון</span><span>✓ אין צורך בכרטיס אשראי במסלול החינמי</span></div></div>
      <div className="auth-card"><h2>כניסה ל־Linkli</h2><p>הזינו את כתובת הדוא״ל והסיסמה שלכם.</p>{query.passwordChanged === "1" ? <div className="auth-success" role="status">הסיסמה עודכנה. אפשר להתחבר מחדש.</div> : null}<AuthForm mode="login" returnTo={returnTo} campaign={campaign} /></div>
    </section>
  </main>;
}
