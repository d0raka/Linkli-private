import { redirect } from "next/navigation";
import AuthForm from "@/app/auth-form";
import AuthLayout from "@/app/site/auth-layout";
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
  return (
    <AuthLayout title="פותחים חשבון בחינם" lead="העמוד הראשון בחינם ובלי כרטיס אשראי. אחרי ההרשמה נשלח לכם קישור לאימות הדוא״ל.">
      <AuthForm mode="register" returnTo={returnTo} campaign={campaign} referralCode={sanitizeReferralCode(flatParams.ref)} />
    </AuthLayout>
  );
}
