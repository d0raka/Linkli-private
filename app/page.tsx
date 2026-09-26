import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowLeft, CalendarCheck, Lock, MapPin, NotePencil, PaperPlaneTilt, SquaresFour, UsersThree } from "@phosphor-icons/react/ssr";
import { getProductUser } from "@/lib/auth";
import { campaignFromObject, withCampaign } from "@/lib/marketing";
import { PLAN_CATALOG } from "@/lib/plans";
import { getTemplate, normalizeTemplateId, safeConfig, templates } from "@/lib/templates";
import { formatHostWhatsAppInvite } from "@/lib/whatsapp-share";
import MarketingTracker from "./marketing-tracker";
import Reveal from "./reveal";
import SiteShell from "./site/site-shell";
import HeroDemo from "./site/hero-demo";
import WhatsAppPreview from "./site/whatsapp-preview";
import PlanColumns from "./site/plan-columns";
import Faq from "./site/faq";
import "./styles/experience.css";
import "./site/phone.css";
import "./site/landing.css";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

const GUIDED = new Set(["birthday", "wedding", "event"]);
const HERO_EXAMPLES = [
  { id: "birthday", label: "יום הולדת" },
  { id: "wedding", label: "חתונה" },
  { id: "date", label: "דייט" },
];
const SHOWCASE = ["wedding", "birthday", "date", "event", "memories", "gift"];

const STEPS = [
  { icon: SquaresFour, title: "בוחרים תבנית", text: "כל תבנית כבר כתובה ומעוצבת לרגע אחר: יום הולדת, חתונה, ברית או דייט." },
  { icon: NotePencil, title: "משנים את מה שצריך", text: "שמות, תאריך, שאלות ותמונה. העמוד מתעדכן מול העיניים בזמן שכותבים." },
  { icon: PaperPlaneTilt, title: "שולחים קישור", text: "מדביקים בוואטסאפ כמו כל הודעה. מי שפותח עובר את הרגע, ואתם רואים מי הגיב." },
];

const HOST_TOOLS = [
  { icon: UsersThree, title: "אישורי הגעה", text: "האורחים עונים בעמוד עצמו, ואתם רואים מי מגיע, כמה אורחים ואיזה שיר ביקשו." },
  { icon: CalendarCheck, title: "יומן בלחיצה", text: "כפתור שמכניס את האירוע ליומן בטלפון, עם השעה והמקום." },
  { icon: MapPin, title: "ניווט עד הדלת", text: "ווייז או מפות נפתחים ישר על הכתובת, בלי לחפש." },
  { icon: Lock, title: "עמוד נעול בסיסמה", text: "רק מי שקיבל את הסיסמה נכנס. מתאים לאירועים פרטיים." },
];

function createHref(templateId: string, signedIn: boolean) {
  if (GUIDED.has(templateId)) return `/create/${templateId}`;
  const studio = `/studio/create?template=${templateId}`;
  return signedIn ? studio : `/register?returnTo=${encodeURIComponent(studio)}`;
}

export default async function LandingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getProductUser();
  const signedIn = Boolean(user);
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] || "" : value || ""]));
  const campaign = campaignFromObject(params);
  const campaignTemplate = params.template ? templates.find((template) => template.id === normalizeTemplateId(params.template)) : undefined;
  const heroTemplate = campaignTemplate?.id || "birthday";
  const examples = [...HERO_EXAMPLES];
  if (campaignTemplate && !examples.some((example) => example.id === campaignTemplate.id)) examples.unshift({ id: campaignTemplate.id, label: campaignTemplate.category });
  const primaryHref = withCampaign(signedIn && GUIDED.has(heroTemplate) ? `/create/${heroTemplate}` : createHref(heroTemplate, signedIn), campaign);
  const startHref = signedIn ? "/studio" : withCampaign("/create/birthday", campaign);
  const birthday = getTemplate("birthday").config;
  const invite = formatHostWhatsAppInvite({ headline: birthday.headline, tease: birthday.subtitle, url: "https://linkli.online/p/daniel", emoji: birthday.emoji });
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Linkli",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    url: "https://linkli.online",
    inLanguage: "he",
    description: "הופכים רגע מיוחד לקישור שאי אפשר להתעלם ממנו. שולחים בוואטסאפ, נפתח עמוד.",
    offers: PLAN_CATALOG.filter((plan) => !plan.waitlist).map((plan) => ({
      "@type": "Offer",
      name: `Linkli ${plan.name}`,
      price: plan.price.replace(/[^\d.]/g, "") || "0",
      priceCurrency: "ILS",
    })),
  };

  return (
    <SiteShell className="landing" loginHref={withCampaign("/login", campaign)} startHref={startHref}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketingTracker campaign={campaign} templateId={campaignTemplate?.id} />

      <section className="hero ui-container" data-size="wide">
        <div className="hero__copy">
          <h1>הופכים רגע מיוחד לקישור שאי אפשר להתעלם ממנו</h1>
          <p>יום הולדת, חתונה או דייט: כמה שאלות קטנות, סיום שמרגש ואישורי הגעה. נשלח בוואטסאפ, נפתח בכל טלפון.</p>
          <div className="hero__actions">
            <Link data-marketing-event="signup_hero" className="ui-button" data-variant="primary" data-size="lg" href={primaryHref}>
              יצירת עמוד בחינם<ArrowLeft aria-hidden="true" />
            </Link>
            <a className="ui-button" data-variant="ghost" data-size="lg" href="#templates">לכל התבניות</a>
          </div>
        </div>
        <HeroDemo
          initial={heroTemplate}
          examples={examples.map((example) => ({ ...example, config: safeConfig(getTemplate(example.id).config, example.id) }))}
        />
      </section>

      <section className="steps ui-container" aria-labelledby="steps-title">
        <div className="steps__intro">
          <h2 id="steps-title" className="landing-title">מרעיון לקישור תוך כמה דקות</h2>
          <p className="landing-lead">בלי מעצב, בלי אפליקציה ובלי לשלוח עשר הודעות בקבוצה.</p>
        </div>
        <ol className="steps__list">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="steps__icon" aria-hidden="true"><Icon weight="duotone" /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="showcase ui-container" data-size="wide" id="templates" aria-labelledby="templates-title">
        <Reveal className="showcase__intro">
          <h2 id="templates-title" className="landing-title">יש רגע? יש עמוד.</h2>
          <p className="landing-lead">דייט זה לא יום הולדת, וחתונה זה לא ברית. לכל תבנית שאלות וסיום משלה.</p>
        </Reveal>
        <ul className="showcase__grid">
          {SHOWCASE.map((id, index) => {
            const template = getTemplate(id);
            return (
              <li key={id} className={index < 2 ? "is-feature" : undefined} style={{ "--thumb-accent": template.config.accent, "--thumb-soft": template.config.accentSoft } as CSSProperties}>
                <Link href={withCampaign(`/preview/${id}`, campaign)} className="showcase__tile">
                  <span className="showcase__thumb" aria-hidden="true">
                    <span className="showcase__emoji">{template.emoji}</span>
                    <span className="showcase__headline">{template.config.headline}</span>
                  </span>
                  <span className="showcase__name">{template.name}{template.free ? null : <span className="ui-badge" data-tone="accent">יוצר</span>}</span>
                  <span className="showcase__desc">{template.description}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="showcase__more">
          עוד:{" "}
          {templates.filter((template) => !SHOWCASE.includes(template.id)).map((template, index, list) => (
            <span key={template.id}><Link href={`/preview/${template.id}`}>{template.name}</Link>{index < list.length - 1 ? ", " : ""}</span>
          ))}
        </p>
      </section>

      <section className="whatsapp ui-container" aria-labelledby="whatsapp-title">
        <div className="whatsapp__copy">
          <h2 id="whatsapp-title" className="landing-title">ככה זה מגיע אליהם</h2>
          <p className="landing-lead">הודעה רגילה עם קישור, בלי אפליקציה ובלי הרשמה. מי שלוחץ נכנס ישר לחוויה, ואפשר לענות לכם בוואטסאפ מהסוף.</p>
        </div>
        <WhatsAppPreview contact="דניאל" message={invite} reply="פתחתי. אין לי מילים, תודה 🥹" />
      </section>

      <section className="hosts ui-container" aria-labelledby="hosts-title">
        <div className="hosts__intro">
          <h2 id="hosts-title" className="landing-title">לאירועים: אישורי הגעה בלי לרדוף אחרי אף אחד</h2>
          <p className="landing-lead">במסלול אירוע ההזמנה עושה גם את העבודה שאחרי.</p>
        </div>
        <dl className="hosts__grid">
          {HOST_TOOLS.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <dt><Icon aria-hidden="true" weight="duotone" />{title}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="pricing ui-container" data-size="wide" id="pricing" aria-labelledby="pricing-title">
        <Reveal className="pricing__intro">
          <h2 id="pricing-title" className="landing-title">העמוד הראשון בחינם. משלמים רק כשצריך יותר.</h2>
          <p className="landing-lead">תשלום חד-פעמי, בלי מנוי ובלי כרטיס אשראי כדי להתחיל.</p>
        </Reveal>
        <PlanColumns signedIn={signedIn} currentPlan={user?.plan} startHref={startHref} />
        <p className="pricing__more"><Link href="/pricing" className="ui-link">השוואה מלאה בין המסלולים</Link></p>
      </section>

      <section className="faq-section ui-container" data-size="narrow" id="faq" aria-labelledby="faq-title">
        <h2 id="faq-title" className="landing-title">שאלות נפוצות</h2>
        <Faq />
      </section>

      <section className="closing" aria-labelledby="closing-title">
        <div className="ui-container closing__inner">
          <h2 id="closing-title">יש לכם רגע מיוחד בקרוב?</h2>
          <Link data-marketing-event="signup_final" className="ui-button" data-variant="primary" data-size="lg" href={primaryHref}>
            יצירת עמוד בחינם<ArrowLeft aria-hidden="true" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
