import AuthLayout from "@/app/site/auth-layout";
import ResetPasswordForm from "./reset-password-form";

export const metadata = { title: "בחירת סיסמה חדשה | Linkli", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token || "";
  return (
    <AuthLayout title="בוחרים סיסמה חדשה" lead="אחרי העדכון ננתק את כל המכשירים שהיו מחוברים, ותתבקשו להיכנס מחדש.">
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}
