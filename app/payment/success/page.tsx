import Link from "next/link";
import LegalHeader from "@/app/legal-header";
import { PROJECT_LIMITS } from "@/lib/plans";

export const metadata = { title: "התשלום הושלם בהצלחה | Linkli Plus" };

export default function PaymentSuccessPage() {
  return (
    <main className="legal-shell" id="main-content">
      <LegalHeader />
      <article className="legal-main">
        <div className="legal-card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 72, marginBottom: 12 }}>🎉</div>
          <span className="score-pill" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" }}>
            מנוי Linkli Plus פעיל!
          </span>
          <h1 style={{ fontSize: 28, margin: "16px 0 8px" }}>איזה כיף, תודה שהצטרפת ל-Plus!</h1>
          <p style={{ maxWidth: 460, margin: "0 auto 24px", color: "var(--muted)", lineHeight: 1.6 }}>
            החשבון שלך שודרג בהצלחה. כעת תוכל ליצור עד <strong>{PROJECT_LIMITS.plus} עמודים</strong>, להשתמש בכל התבניות ללא הגבלה ולפרסם עמודים נקיים ללא מיתוג Linkli.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/studio" className="button button-primary">
              ללכת לאזור האישי והעמודים שלי ←
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
