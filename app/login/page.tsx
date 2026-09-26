import { redirect } from "next/navigation";
import AuthForm from "@/app/auth-form";
import AuthLayout from "@/app/site/auth-layout";
import { Notice } from "@/app/ui/status";
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
  return (
    <AuthLayout title="טוב שחזרתם" lead="נכנסים וממשיכים מאיפה שעצרתם.">
      {query.passwordChanged === "1" ? <Notice tone="success" className="auth-notice">הסיסמה עודכנה. אפשר להיכנס מחדש.</Notice> : null}
      {query.accountDeleted === "1" ? <Notice tone="success" className="auth-notice">החשבון נמחק. אפשר להירשם שוב בכל זמן.</Notice> : null}
      <AuthForm mode="login" returnTo={returnTo} campaign={campaign} />
    </AuthLayout>
  );
}
