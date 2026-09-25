import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/app/auth-form";
import { getProductUser, safeReturnTo } from "@/lib/auth";
import { campaignFromObject } from "@/lib/marketing";
import { sanitizeReferralCode } from "@/lib/referrals";

export const dynamic = "force-dynamic";
export const metadata = { title: "הרשמה | Linkli", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getProductUser()) redirect("/studio");
  const rawParams = await searchParams;
  const flatParams = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] || "" : value || ""]));
  const returnTo = safeReturnTo(flatParams.returnTo);
  const campaign = campaignFromObject(flatParams);
  return <main className="auth-shell" id="main-content">
    <Link href="/" className="brand auth-brand">Link<span>li</span></Link>
    <section className="auth-layout">
      <div className="auth-message"><span className="kicker">מתחילים בחינם</span><h1>חשבון קטן.<br />העמודים שלכם בפנים.</h1><p>שומרים טיוטות, מפרסמים, ושולחים בוואטסאפ מאותו מקום.</p><div className="auth-points"><span>✓ עמוד ראשון בחינם</span><span>✓ בלי כרטיס אשראי</span><span>✓ אימות דוא״ל</span></div></div>
      <div className="auth-card"><h2>פתיחת חשבון</h2><p>אחרי ההרשמה נשלח אליך קישור לאימות כתובת הדוא״ל.</p><AuthForm mode="register" returnTo={returnTo} campaign={campaign} referralCode={sanitizeReferralCode(flatParams.ref)} /></div>
    </section>
  </main>;
}
