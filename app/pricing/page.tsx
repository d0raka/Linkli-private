import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Check, Minus } from "@phosphor-icons/react/ssr";
import { ensureDatabase } from "@/db";
import { getProductUser } from "@/lib/auth";
import { getPlanName, pageLimit } from "@/lib/plans";
import { ensureReferralCode } from "@/lib/referrals";
import { canonicalOrigin } from "@/lib/site";
import SiteShell from "@/app/site/site-shell";
import PlanColumns from "@/app/site/plan-columns";
import ReferralCopy from "./referral-copy";
import "@/app/site/landing.css";
import "./pricing.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "מסלולים ומחירים | Linkli",
  description: "העמוד הראשון בחינם. מסלול יוצר לתמונות, שיר ועמוד נקי. מסלול אירוע לאישורי הגעה, יומן, ניווט וסיסמה. תשלום חד-פעמי.",
  alternates: { canonical: "/pricing" },
};

type Cell = boolean | string;
const ROWS: Array<{ label: string; values: [Cell, Cell, Cell, Cell] }> = [
  { label: "עמודים מפורסמים", values: ["1", "3", "10", "ללא הגבלה"] },
  { label: "טיוטות", values: ["ללא הגבלה", "ללא הגבלה", "ללא הגבלה", "ללא הגבלה"] },
  { label: "שיתוף בוואטסאפ", values: [true, true, true, true] },
  { label: "כל התבניות", values: ["התבניות הפתוחות", true, true, true] },
  { label: "עמוד בלי הסימן של Linkli", values: [false, true, true, true] },
  { label: "תמונות מהאלבום ושיר ברקע", values: [false, true, true, true] },
  { label: "יומן, ווייז ומפות", values: [false, false, true, true] },
  { label: "אישורי הגעה וייצוא לאקסל", values: [false, false, true, true] },
  { label: "ספירה לאחור, מונה אורחים ובקשת שיר", values: [false, false, true, true] },
  { label: "נעילת העמוד בסיסמה", values: [false, false, true, true] },
];
const COLUMNS = ["חינם", "יוצר", "אירוע", "ארגונים"];

function CellValue({ value }: { value: Cell }) {
  if (value === true) return <><Check aria-hidden="true" weight="bold" className="is-yes" /><span className="sr-only">כלול</span></>;
  if (value === false) return <><Minus aria-hidden="true" weight="bold" className="is-no" /><span className="sr-only">לא כלול</span></>;
  return <>{value}</>;
}

export default async function PricingPage() {
  const user = await getProductUser();
  let referralUrl = "";
  if (user) {
    const code = await ensureReferralCode(await ensureDatabase(), user.email);
    const origin = canonicalOrigin((await headers()).get("host"));
    referralUrl = code ? `${origin}/?ref=${code}` : "";
  }
  const startHref = user ? "/studio" : "/create/birthday";

  return (
    <SiteShell className="landing">
      <section className="pricing-hero ui-container" data-size="wide">
        <h1>העמוד הראשון בחינם. משלמים רק כשצריך יותר.</h1>
        <p className="landing-lead">תשלום חד-פעמי למסלול, בלי מנוי מתחדש ובלי כרטיס אשראי כדי להתחיל.</p>
        {user ? (
          <p className="pricing-hero__current">
            המסלול שלך: <b>{getPlanName(user.plan)}</b> · עד {pageLimit(user.plan, user.bonusPages)} עמודים מפורסמים{user.bonusPages ? `, כולל ${user.bonusPages} מהפניות` : ""}
          </p>
        ) : null}
      </section>

      <section className="ui-container" data-size="wide" aria-label="מסלולים">
        <PlanColumns signedIn={Boolean(user)} currentPlan={user?.plan} startHref={startHref} />
      </section>

      <section className="pricing-compare ui-container" data-size="wide" aria-labelledby="compare-title">
        <h2 id="compare-title" className="landing-title">מה כלול בכל מסלול</h2>
        <div className="ui-table-wrap">
          <table className="ui-table pricing-table">
            <thead>
              <tr><th scope="col"><span className="sr-only">יכולת</span></th>{COLUMNS.map((name) => <th scope="col" key={name}>{name}</th>)}</tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((value, index) => <td key={COLUMNS[index]}><CellValue value={value} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pricing-referral ui-container" aria-labelledby="referral-title">
        <div>
          <h2 id="referral-title" className="landing-title">מזמינים חבר, מקבלים עמוד מתנה</h2>
          <p className="landing-lead">כשמישהו נרשם דרך הקישור האישי שלכם ורוכש מסלול יוצר או אירוע, נוסף לכם עמוד מפורסם אחד למכסה.</p>
        </div>
        {referralUrl ? <ReferralCopy url={referralUrl} /> : <Link className="ui-button" data-variant="primary" href="/register?returnTo=%2Fpricing">פתיחת חשבון וקבלת קישור</Link>}
      </section>

      <section className="pricing-help ui-container" data-size="narrow">
        <p>שאלות על תשלום, ביטול או החזר? <Link href="/#faq" className="ui-link">שאלות נפוצות</Link> או <Link href="/contact?topic=billing" className="ui-link">פנייה אלינו</Link>.</p>
      </section>
    </SiteShell>
  );
}
