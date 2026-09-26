import Link from "next/link";
import AuthLayout from "@/app/site/auth-layout";
import ForgotPasswordForm from "./forgot-password-form";

export const metadata = { title: "איפוס סיסמה | Linkli", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="שכחתם את הסיסמה?"
      lead="הזינו את כתובת הדוא״ל של החשבון. אם היא רשומה, נשלח אליה קישור חד-פעמי לבחירת סיסמה חדשה, בתוקף ל-30 דקות."
      footer={<>נזכרתם? <Link href="/login">חזרה לכניסה</Link></>}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
