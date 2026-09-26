import PublishedExperience from "@/app/p/[slug]/published-experience";
import Link from "next/link";
import { getProductUser } from "@/lib/auth";
import { getTemplate, safeConfig, normalizeTemplateId, templates } from "@/lib/templates";
import { PLAN_CATALOG } from "@/lib/plans";
import { campaignFromObject, withCampaign } from "@/lib/marketing";
import { formatHostWhatsAppInvite } from "@/lib/whatsapp-share";
import MarketingTracker from "./marketing-tracker";
import LandingPlanButton from "./paywall/landing-plan-button";
import LandingNav from "./landing-nav";
import Reveal from "./reveal";
import WhatsAppDevice from "./whatsapp-device";
import "./styles/experience.css";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

const OCCASIONS = ["ימי הולדת", "חתונות", "בריתות", "בר ובת מצווה", "חינה", "דייטים", "מתנות"];
const PATH_STEPS = [
  { title: "בוחרים רגע", text: "דייט, יום הולדת, חתונה — מה שחשוב עכשיו." },
  { title: "כותבים כמה מילים", text: "שם, משפט, מה שתרצו שיקראו." },
  { title: "שולחים קישור", text: "בוואטסאפ, כמו כל הודעה. מי שפותח — נכנס." },
];

export default async function LandingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getProductUser();
  const rawParams = await searchParams;
  const flatParams = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] || "" : value || ""]));
  const campaign = campaignFromObject(flatParams);
  const campaignTemplate = typeof flatParams.template === "string"
    ? templates.find((template) => template.id === normalizeTemplateId(flatParams.template))
    : undefined;
  const homeHref = user ? "/studio" : "/";
  const birthdayStartHref = "/create/birthday";
  const datePreviewHref = "/preview/date";
  const landingTemplates = ["date", "birthday", "wedding", "event", "memories", "gift", "brit", "henna"].map((id) => templates.find((template) => template.id === id)!);
  const dateTemplate = getTemplate("date");
  const demoInvite = formatHostWhatsAppInvite({
    headline: dateTemplate.config.headline,
    tease: dateTemplate.config.subtitle,
    url: "https://linkli.online/p/shira",
    emoji: dateTemplate.config.emoji,
  });
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Linkli",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    url: "https://linkli.online",
    inLanguage: "he",
    description: "הופכים רגע מיוחד לקישור שאי אפשר להתעלם ממנו. שולחים בוואטסאפ, נפתח עמוד.",
    offers: PLAN_CATALOG.map((plan) => ({
      "@type": "Offer",
      name: `Linkli ${plan.name}`,
      price: plan.price.replace(/[^\d.]/g, "") || "0",
      priceCurrency: "ILS",
    })),
  };

  return (
    <main className="landing-shell" id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketingTracker campaign={campaign} templateId={campaignTemplate?.id} />
      <LandingNav
        homeHref={homeHref}
        startHref={birthdayStartHref}
        loginHref={withCampaign("/login", campaign)}
        signedIn={Boolean(user)}
        pricingHref={user ? "#pricing" : "/paywall"}
      />

      <section className="editorial-hero wrap">
        <Reveal className="editorial-hero-copy" eager>
          <p className="hero-kicker">שולחים בוואטסאפ · נפתח כעמוד</p>
          <h1>הופכים רגע מיוחד<br />לקישור שאי אפשר להתעלם ממנו</h1>
          <p>במקום הודעה שנעלמת בקבוצה — קישור. מי שפותח מקבל רגע: דייט, יום הולדת, חתונה. לא עוד שורה בין מאה הודעות.</p>
          <div className="hero-actions">
            <Link data-marketing-event="signup_hero" className="button button-primary" href={datePreviewHref}>
              תראו איך נראית הזמנה לדייט <span aria-hidden="true">←</span>
            </Link>
            <small>בלי חשבון. בלי כרטיס.</small>
          </div>
          <div className="occasion-links">
            <Link href="/create/wedding">מתחתנים?</Link>
            <Link href="/create/event">מזמינים לאירוע?</Link>
          </div>
          <ul className="hero-occasions" aria-label="סוגי הזמנות">
            {OCCASIONS.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Reveal>
        <Reveal className="hero-preview-wrap" eager delay={80}>
          <div className="hero-preview invitation-demo">
            <div className="preview-chrome-desktop" aria-hidden="true">
              <span className="preview-dots"><i /><i /><i /></span>
              <span className="preview-url">linkli.online/p/shira</span>
            </div>
            <div className="preview-chrome-phone" aria-hidden="true">
              <i className="device-notch" />
              <div className="invitation-demo-caption">
                <span>לשירה</span>
                <span>נפתח בטלפון</span>
              </div>
            </div>
            <div className="device-screen preview-screen">
              <PublishedExperience
                slug="date-example"
                templateId="date"
                config={safeConfig(dateTemplate.config, "date")}
                showWatermark
                embedded
                previewMode
                trackAnalytics={false}
              />
            </div>
            <Link href={datePreviewHref}>לראות במסך מלא ↗</Link>
          </div>
        </Reveal>
        <Reveal as="div" className="landing-path" aria-label="איך זה עובד">
          {PATH_STEPS.map((step) => (
            <div key={step.title}>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="section wrap" id="templates">
        <Reveal className="section-heading">
          <div>
            <h2>יש רגע? יש עמוד.</h2>
          </div>
          <p>דייט זה לא יום הולדת, וחתונה זה לא ברית. לכל רגע שאלות וסיום משלו — פותחים, משנים שמות, שולחים.</p>
        </Reveal>
        <div className="template-grid landing-templates">
          {landingTemplates.map((template, index) => (
            <Reveal as="article" className={`template-showcase paper-${template.id}`} key={template.id} delay={index * 40}>
              <Link href={withCampaign(`/preview/${template.id}`, campaign)} className="template-art" aria-label={`תצוגה מקדימה של ${template.name}`}>
                <i>{template.category}</i>
                <div className="template-mini">
                  <span>{template.emoji}</span>
                  <strong>{template.config.headline}</strong>
                </div>
              </Link>
              <div className="template-info">
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <div className="template-actions">
                  <Link href={withCampaign(`/preview/${template.id}`, campaign)} className="template-preview-link" aria-label={`תצוגה מקדימה: ${template.name}`}>תצוגה</Link>
                  <Link
                    data-marketing-event={`template_${template.id}`}
                    href={["birthday", "wedding", "event"].includes(template.id) ? `/create/${template.id}` : user ? `/studio/create?template=${template.id}` : withCampaign(`/register?returnTo=${encodeURIComponent(`/studio/create?template=${template.id}`)}`, campaign)}
                    className="template-use-link"
                  >
                    {template.free ? "יצירה בחינם" : "במסלול יוצר"} <span>←</span>
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal as="div" className="template-index" aria-label="עוד הזמנות">
          {templates.filter((template) => !landingTemplates.some((item) => item.id === template.id)).map((template) => (
            <Link key={template.id} href={`/preview/${template.id}`}>{template.name} <span aria-hidden="true">↗</span></Link>
          ))}
        </Reveal>
      </section>

      <section className="sent-note wrap">
        <Reveal>
          <p className="hero-kicker">ככה זה מגיע אליהם</p>
          <h2>״הכנתי לך משהו.<br />תפתח כשיש לך רגע.״</h2>
          <p>מדביקים בוואטסאפ כמו כל הודעה. בלי לחבר כלום, בלי לבקש מהם להוריד אפליקציה.</p>
        </Reveal>
        <Reveal delay={80}>
          <WhatsAppDevice message={demoInvite} href={datePreviewHref} name="שירה" caption="הודעה רגילה. הקישור עושה את השאר." />
        </Reveal>
      </section>

      <section className="section wrap" id="pricing">
        <Reveal className="center-heading">
          <h2>עמוד ראשון בחינם. משלמים רק אם צריך יותר.</h2>
          <p>אפשר לשלוח עמוד אחד בלי לשלם. תמונות, שיר ואישורי הגעה — כשצריך יותר מרגע אחד.</p>
        </Reveal>
        <div className="pricing-grid landing-pricing-grid">
          {PLAN_CATALOG.map((plan, index) => (
            <Reveal as="article" className={`price-card ${plan.featured ? "featured" : ""} ${plan.waitlist ? "is-waitlist" : ""}`} key={plan.id} delay={index * 40}>
              <div className="popular-slot">
                {plan.featured ? <div className="popular">לרוב האנשים</div> : null}
              </div>
              <div className="price-card-header">
                <span className="plan-label">{plan.name}</span>
                <h3>{plan.price} <small>/ {plan.cadence}</small></h3>
                <p>{plan.summary}</p>
              </div>
              <ul>
                {plan.features.map((item) => <li key={item}>{item}</li>)}
                {plan.blocked.map((item) => <li className="muted" key={item}>{item}</li>)}
              </ul>
              {plan.id === "free" ? (
                <Link href={birthdayStartHref} className={`button ${plan.featured ? "button-primary" : "button-outline"}`}>
                  {user ? "לעמודים שלי" : "מתחילים בחינם"}
                </Link>
              ) : user ? (
                <LandingPlanButton email={user.email} currentPlan={user.plan} planId={plan.id} featured={plan.featured} label={plan.waitlist ? "להרשמה מוקדמת" : `ל${plan.name}`} />
              ) : (
                <Link href={`/register?returnTo=${encodeURIComponent(`/checkout?plan=${plan.id}`)}`} className={`button ${plan.featured ? "button-primary" : "button-outline"}`}>
                  {plan.waitlist ? "להרשמה מוקדמת" : `ל${plan.name}`}
                </Link>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal as="section" className="final-cta wrap">
        <h2>יש לכם רגע מיוחד?</h2>
        <p>תראו קודם איך זה נראה. נרשמים רק אם רוצים לשמור.</p>
        <Link data-marketing-event="signup_final" href={datePreviewHref} className="button button-light">תראו איך נראית הזמנה לדייט ←</Link>
      </Reveal>

      <footer className="footer wrap">
        <Link href={homeHref} className="brand">Link<span>li</span></Link>
        <p>רגע מיוחד, קישור שאי אפשר להתעלם ממנו.</p>
        <div>
          <Link href="/legal">תנאים ופרטיות</Link>
          <Link href="/accessibility">נגישות</Link>
          <Link href="/contact">יצירת קשר</Link>
        </div>
      </footer>
    </main>
  );
}
