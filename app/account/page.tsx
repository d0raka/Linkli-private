import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { CreditCard, Gift } from "@phosphor-icons/react/ssr";
import { ensureDatabase, runtimeValue } from "@/db";
import { isAdminEmail, requireProductUser } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/billing";
import { PLAN_CATALOG, getPlanName, isPaidPlan, pageLimit } from "@/lib/plans";
import { ensureReferralCode } from "@/lib/referrals";
import { canonicalOrigin } from "@/lib/site";
import AppShell from "@/app/app-shell/app-shell";
import { Badge, PageHeader } from "@/app/ui/status";
import ReferralCopy from "@/app/pricing/referral-copy";
import { DeleteAccountSection, PasswordSection, ProfileSection, SessionsSection } from "./account-client";
import "./account.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "הגדרות חשבון | Linkli", robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeZone: "Asia/Jerusalem" });

function formatDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
}

const SECTIONS = [
  ["profile", "פרופיל"],
  ["plan", "מסלול וחיוב"],
  ["referral", "הפניות"],
  ["security", "סיסמה"],
  ["devices", "מכשירים"],
  ["delete", "מחיקת חשבון"],
] as const;

export default async function AccountPage() {
  const user = await requireProductUser("/account");
  const db = await ensureDatabase();
  const extras = await db.prepare(
    `SELECT users.created_at,
      (SELECT COUNT(*) FROM sessions WHERE user_email = users.email AND expires_at > CAST(strftime('%s', 'now') AS INTEGER)) AS session_count,
      (SELECT COUNT(*) FROM projects WHERE owner_email = users.email AND published = 1) AS published_count
     FROM users WHERE email = ?`,
  ).bind(user.email).first();
  const referralCode = await ensureReferralCode(db, user.email);
  const origin = canonicalOrigin((await headers()).get("host"));
  const subscriptionActive = await hasActiveSubscription(db, user.email);
  const portalReady = Boolean(runtimeValue("BILLING_PORTAL_URL"));
  const paid = isPaidPlan(user.plan);
  const limit = pageLimit(user.plan, user.bonusPages);
  const published = Number(extras?.published_count || 0);
  const plan = PLAN_CATALOG.find((item) => item.id === user.plan) || PLAN_CATALOG[0];
  const joined = formatDate(String(extras?.created_at || ""));
  const isAdmin = isAdminEmail(user.email);

  return (
    <AppShell user={user} current="account">
      <PageHeader title="הגדרות חשבון" lead={joined ? `חשבון מ-${joined}` : undefined} />
      <div className="account-layout">
        <nav className="account-nav" aria-label="חלקי ההגדרות">
          <ul>{SECTIONS.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ul>
        </nav>

        <div className="account-sections">
          <ProfileSection email={user.email} initialName={user.displayName} emailVerified={user.emailVerified} />

          <section className="ui-panel account-section" id="plan" aria-labelledby="plan-title">
            <div className="ui-panel__section">
              <div className="account-section__head">
                <div>
                  <h2 className="ui-section-title" id="plan-title">מסלול וחיוב</h2>
                  <p className="ui-section-lead">{paid ? "תשלום חד-פעמי. אין חיוב חוזר על המסלול." : plan.summary}</p>
                </div>
                <Badge tone={paid ? "accent" : "neutral"}>{getPlanName(user.plan)}</Badge>
              </div>
              <div className="account-usage">
                <div className="account-usage__label"><span>עמודים מפורסמים</span><b>{published} מתוך {limit}</b></div>
                <div className="account-usage__bar" role="img" aria-label={`${published} מתוך ${limit} עמודים מפורסמים`}><span style={{ width: `${Math.min(100, (published / Math.max(limit, 1)) * 100)}%` }} /></div>
                {user.bonusPages ? <p className="ui-hint">כולל {user.bonusPages} עמודים שקיבלתם על הפניות.</p> : null}
              </div>
              <ul className="account-features">
                {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <div className="account-actions">
                {user.plan !== "max" && user.plan !== "business"
                  ? <Link href={paid ? "/checkout?plan=max" : "/pricing"} className="ui-button" data-variant="primary">{paid ? "שדרוג למסלול אירוע" : "השוואת מסלולים"}</Link>
                  : null}
                {paid && portalReady ? (
                  <form action="/api/billing/portal" method="post"><button className="ui-button" type="submit"><CreditCard aria-hidden="true" />קבלות וניהול תשלומים</button></form>
                ) : paid ? (
                  <Link href="/contact?topic=billing" className="ui-button">עזרה עם תשלום או החזר</Link>
                ) : null}
              </div>
            </div>
          </section>

          <section className="ui-panel account-section" id="referral" aria-labelledby="referral-title">
            <div className="ui-panel__section">
              <div className="account-section__head">
                <div>
                  <h2 className="ui-section-title" id="referral-title">מזמינים חבר, מקבלים עמוד</h2>
                  <p className="ui-section-lead">כשמישהו נרשם דרך הקישור שלכם ורוכש מסלול בתשלום, נוסף לכם עמוד מפורסם אחד למכסה.</p>
                </div>
                <Gift aria-hidden="true" className="account-section__icon" weight="duotone" />
              </div>
              {referralCode ? <ReferralCopy url={`${origin}/?ref=${referralCode}`} /> : <p className="ui-hint">הקישור יופיע כאן אחרי רענון.</p>}
            </div>
          </section>

          <PasswordSection />
          <SessionsSection sessionCount={Number(extras?.session_count || 1)} />
          <DeleteAccountSection email={user.email} isAdmin={isAdmin} hasActiveSubscription={subscriptionActive} />
        </div>
      </div>
    </AppShell>
  );
}
