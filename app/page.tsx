import Link from "next/link";
import { getProductUser } from "@/lib/auth";
import { templates } from "@/lib/templates";
import { PROJECT_LIMITS } from "@/lib/plans";
import { campaignFromObject, withCampaign } from "@/lib/marketing";
import MarketingTracker from "./marketing-tracker";
import MarketingWaitlistForm from "./marketing-waitlist-form";
import HeroInteractive from "./hero-interactive";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

export default async function LandingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getProductUser();
  const rawParams = await searchParams;
  const flatParams = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] || "" : value || ""]));
  const campaign = campaignFromObject(flatParams);
  const campaignTemplate = typeof flatParams.template === "string" ? templates.find((template) => template.id === flatParams.template) : undefined;
  const homeHref = user ? "/studio" : "/";
  const creationPath = campaignTemplate ? `/studio/create?template=${campaignTemplate.id}` : "/studio";
  const startHref = user ? creationPath : withCampaign(`/register?returnTo=${encodeURIComponent(creationPath)}`, campaign);
  const freeTemplateCount = templates.filter((template) => template.free).length;
  const totalTemplateCount = templates.length;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Linkli",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    url: "https://linkli.online",
    inLanguage: "he",
    description: "יצירת עמודים אינטראקטיביים לאירועים, הפתעות, חידונים ורגעים אישיים.",
    offers: [
      { "@type": "Offer", name: "Linkli Free", price: "0", priceCurrency: "ILS" },
      { "@type": "Offer", name: "Linkli Plus", price: "9.90", priceCurrency: "ILS" },
    ],
  };
  return (
    <main className="landing-shell" id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketingTracker campaign={campaign} templateId={campaignTemplate?.id} />
      <nav className="topbar wrap">
        <Link href={homeHref} className="brand">Link<span>li</span></Link>
        <div className="nav-links">
          <a href="#templates">תבניות</a>
          <a href="#pricing">מסלולים</a>
          {user ? <Link className="button button-small button-dark" href="/studio">לעמודים שלי</Link> : <><Link href={withCampaign("/login", campaign)}>כניסה</Link><Link data-marketing-event="signup_nav" className="button button-small button-dark" href={startHref}>הרשמה חינם</Link></>}
        </div>
      </nav>

      <section className="hero wrap">
        <div className="hero-copy">
          <h1>{campaignTemplate ? <>יוצרים {campaignTemplate.name}<br />ש<span className="marker">כולם ירצו לפתוח.</span></> : <>הופכים רגע מיוחד<br />לקישור ש<span className="marker">אי אפשר להתעלם ממנו.</span></>}</h1>
          <p>{campaignTemplate ? `${campaignTemplate.description} מתחילים מתבנית מוכנה, מתאימים את התוכן ומשתפים קישור אחד שנראה מצוין בכל מכשיר.` : "יוצרים הזמנה, הפתעה, חידון או ברכה אישית עם שאלות, אנימציות ועמוד סיום מעוצב — ואז שולחים קישור אחד שנראה מצוין בכל מכשיר."}</p>
          <div className="hero-actions">
            <Link data-marketing-event="signup_hero" className="button button-primary" href={startHref}>{user ? "לעמודים שלי" : campaignTemplate ? `יצירת ${campaignTemplate.name} בחינם` : "יצירת עמוד בחינם"} <span>←</span></Link>
            <a className="text-link" href="#templates">לצפייה בתבניות</a>
          </div>
          <div className="trust-row">
            <span className="trust-icon" aria-hidden="true">✦</span>
            <span>ללא כרטיס אשראי · מוכנים לשיתוף בתוך דקות</span>
          </div>
        </div>

        <HeroInteractive />
      </section>

      <section className="logo-strip">
        <div className="wrap strip-inner"><span>מתאים במיוחד ל־</span><b>ימי הולדת 🎂</b><b>אירועים 🥂</b><b>דייטים 💘</b><b>חברים 🤝</b></div>
      </section>

      <section className="section wrap" id="templates">
        <div className="section-heading"><div><span className="kicker">מתחילים מתבנית</span><h2>משהו לכל רגע</h2></div><p>בוחרים רגע, פותחים תצוגה חיה, ואז הופכים אותה לעמוד משלכם.</p></div>
        <div className="template-grid landing-templates">
          {templates.map((template, index) => (
            <article className={`template-showcase template-tone-${index + 1}`} key={template.id}>
              <Link href={withCampaign(`/preview/${template.id}`, campaign)} className="template-art" aria-label={`תצוגה מקדימה של ${template.name}`}><span>{template.emoji}</span><i>{template.category}</i><b>תצוגה חיה</b></Link>
              <div className="template-info"><h3>{template.name}</h3><p>{template.description}</p><small>3 שאלות · אנימציות · תוצאה אישית</small><div className="template-actions"><Link href={withCampaign(`/preview/${template.id}`, campaign)} className="template-preview-link">תצוגה מקדימה</Link><Link data-marketing-event={`template_${template.id}`} href={user ? `/studio/create?template=${template.id}` : withCampaign(`/register?returnTo=${encodeURIComponent(`/studio/create?template=${template.id}`)}`, campaign)} className="template-use-link">{template.free ? "יצירה בחינם" : "יצירה עם Plus"} <span>←</span></Link></div></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section how-section">
        <div className="wrap">
          <div className="center-heading"><span className="kicker">פשוט. ממש פשוט.</span><h2>שלושה צעדים ויש לכם עמוד</h2></div>
          <div className="steps-grid">
            <article><span>01</span><div>🧩</div><h3>בוחרים תבנית</h3><p>מתחילים מהסגנון שמתאים לרגע שלכם.</p></article>
            <article><span>02</span><div>✍️</div><h3>הופכים אותה לשלכם</h3><p>עורכים שאלות, תשובות, צבעים ואת כפתור השיתוף.</p></article>
            <article><span>03</span><div>🚀</div><h3>מפרסמים ומשתפים</h3><p>מקבלים קישור מוכן לשיתוף ב־WhatsApp וברשתות החברתיות.</p></article>
          </div>
        </div>
      </section>

      <section className="section wrap" id="pricing">
        <div className="center-heading"><span className="kicker">פשוט להתחיל</span><h2>מתחילים בחינם, משדרגים כשצריך</h2><p>העמוד הראשון נותן לכם לבדוק את הרעיון באמת. Plus מיועד ליוצרים, זוגות ומארחים שרוצים כמה עמודים וקישור נקי בלי מיתוג.</p></div>
        <div className="pricing-grid">
          <article className="price-card"><div><span className="plan-label">חינם</span><h3>₪0 <small>/ ללא הגבלת זמן</small></h3><p>דרך מהירה ליצור עמוד ראשון ולראות איך כולם מתלהבים.</p></div><ul><li>✓ יצירה מהירה של עמוד אישי</li><li>✓ שיתוף קל ומענה ב-WhatsApp</li><li>✓ אנימציות ועיצוב דינמי</li><li>✓ מעקב צפיות ותגובות בזמן אמת</li><li className="muted">✖ כולל מיתוג Linkli בתחתית העמוד</li></ul><Link href={startHref} className="button button-outline">{user ? "לעמודים שלי" : "מתחילים בחינם"}</Link></article>
          <article className="price-card featured"><div className="popular">הבחירה של היוצרים והמארחים</div><div><span className="plan-label">Plus</span><h3>₪9.90 <small>/ לחודש</small></h3><p>כל הכלים המתקדמים ליצירת עמודים מרגשים ללא שום מגבלה.</p></div><ul><li>✓ יצירת עד 10 עמודים במקביל</li><li>✓ גישה מלאה לכל התבניות במערכת</li><li>✓ עמודים נקיים לחלוטין ללא מיתוג Linkli</li><li>✓ מענה מרובה ערוצים (WhatsApp, Telegram, DM)</li><li>✓ רכיבים אינטראקטיביים (ספירה לאחור, Waze, שוברי מתנה)</li><li>✓ הגנת סיסמה ושליטה מלאה בפרטיות</li></ul><Link href="/checkout" className="button button-primary">שדרוג ל־Plus <span>←</span></Link></article>
        </div>
        <div className="marketing-pilot" id="marketing-pilot">
          <div><span className="kicker">Linkli Plus</span><h3>רוצים ליצור יותר מעמוד אחד?</h3><p>שדרגו עכשיו ל-Plus ותיהנו מכל התבניות, מענה מרובה ערוצים ופרסום עמודים ללא מיתוג.</p></div>
          <MarketingWaitlistForm campaign={campaign} compact />
        </div>
      </section>

      <section className="final-cta wrap"><span>✦</span><h2>הרעיון כבר אצלכם.<br />בואו נהפוך אותו לעמוד שאפשר לשתף.</h2><p>העמוד הראשון שלכם יכול להיות מוכן בתוך כמה דקות.</p><Link data-marketing-event="signup_final" href={startHref} className="button button-light">{user ? "חזרה לעמודים שלי" : "יצירת עמוד בחינם"} ←</Link></section>

      <footer className="footer wrap"><Link href={homeHref} className="brand">Link<span>li</span></Link><p>עמודים קטנים לרגעים גדולים.</p><div><Link href="/legal">תנאים ופרטיות</Link><Link href="/accessibility">נגישות</Link><Link href="/contact">יצירת קשר</Link></div></footer>
    </main>
  );
}
