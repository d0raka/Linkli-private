import Link from "next/link";
import { ensureDatabase } from "@/db";
import { isAdminEmail, requireProductUser } from "@/lib/auth";
import { getPlanName, pageLimit } from "@/lib/plans";
import { ensureReferralCode } from "@/lib/referrals";
import { hasActiveSubscription } from "@/lib/billing";
import { canonicalOrigin } from "@/lib/site";
import { headers } from "next/headers";
import AppTopbar from "@/app/app-topbar";
import AccountClient from "./account-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "הגדרות החשבון | Linkli", robots: { index: false, follow: false } };

function formatAccountDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" }).format(date);
}

function formatLastSeen(value: number) {
  if (!value) return "";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value * 1000));
}

export default async function AccountPage() {
  const user = await requireProductUser("/account");
  const db = await ensureDatabase();
  const extras = await db.prepare(
    `SELECT users.created_at,
      (SELECT COUNT(*) FROM sessions WHERE user_email = users.email AND expires_at > CAST(strftime('%s', 'now') AS INTEGER)) AS session_count,
      (SELECT last_seen_at FROM sessions WHERE user_email = users.email AND expires_at > CAST(strftime('%s', 'now') AS INTEGER) ORDER BY last_seen_at DESC LIMIT 1) AS last_seen_at,
      (SELECT COUNT(*) FROM projects WHERE owner_email = users.email) AS project_count
     FROM users WHERE email = ?`,
  ).bind(user.email).first();

  const referralCode = await ensureReferralCode(db, user.email);
  const requestHeaders = await headers();
  const origin = canonicalOrigin(requestHeaders.get("host"));
  const subscriptionActive = await hasActiveSubscription(db, user.email);

  return (
    <main className="account-shell" id="main-content">
      <AppTopbar displayName={user.displayName} plan={user.plan} isAdmin={user.isAdmin} current="account" />
      <section className="account-main">
        <Link href="/studio" className="account-back">
          <span aria-hidden="true">→</span>
          חזרה לסטודיו
        </Link>
        <div className="account-hero">
          <div className="account-hero-avatar" aria-hidden="true">{user.displayName.slice(0, 1)}</div>
          <div>
            <span className="kicker">הגדרות החשבון</span>
            <h1>שלום, {user.displayName}</h1>
            <p>כאן מנהלים את הפרופיל, האבטחה והמנוי — בלי לגעת בעמודים עצמם.</p>
          </div>
        </div>
        <nav className="settings-tabs" aria-label="הגדרות החשבון">
          <Link href="/account" className="active" aria-current="page">
            <span aria-hidden="true">◉</span> פרופיל ואבטחה
          </Link>
          <Link href="/checkout">
            <span aria-hidden="true">◇</span> מנוי וחיוב
          </Link>
        </nav>
        <AccountClient
          email={user.email}
          initialName={user.displayName}
          emailVerified={user.emailVerified}
          plan={user.plan}
          isAdmin={isAdminEmail(user.email)}
          createdLabel={formatAccountDate(String(extras?.created_at || ""))}
          lastSeenLabel={formatLastSeen(Number(extras?.last_seen_at || 0))}
          sessionCount={Number(extras?.session_count || 1)}
          projectCount={Number(extras?.project_count || 0)}
          pageLimit={pageLimit(user.plan, user.bonusPages)}
          bonusPages={user.bonusPages}
          referralUrl={referralCode ? `${origin}/?ref=${referralCode}` : ""}
          planName={getPlanName(user.plan)}
          hasActiveSubscription={subscriptionActive}
        />
      </section>
    </main>
  );
}
