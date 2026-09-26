import AuthLayout from "@/app/site/auth-layout";
import { safeReturnTo } from "@/lib/auth";
import VerifyEmailClient from "./verify-email-client";

export const metadata = { title: "אימות כתובת דוא״ל | Linkli", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; sent?: string; delivery?: string; returnTo?: string }> }) {
  const query = await searchParams;
  const token = typeof query.token === "string" && /^[0-9a-f]{64}$/i.test(query.token) ? query.token : "";
  const returnTo = safeReturnTo(query.returnTo);
  return (
    <AuthLayout title="מאמתים את כתובת הדוא״ל" lead="צעד אחד לפני שנכנסים: לוחצים על הקישור ששלחנו, ומשם ממשיכים ישר לעמודים שלכם.">
      <VerifyEmailClient token={token} sent={query.sent === "1"} deliveryUnavailable={query.delivery === "failed" || query.delivery === "unavailable"} returnTo={returnTo} />
    </AuthLayout>
  );
}
