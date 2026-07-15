import Link from "next/link";
import { getProductUser } from "@/lib/auth";
import { templates } from "@/lib/templates";
import { PROJECT_LIMITS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getProductUser();
  const homeHref = user ? "/studio" : "/";
  const startHref = user ? "/studio" : "/register";
  const freeTemplateCount = templates.filter((template) => template.free).length;
  const totalTemplateCount = templates.length;
  return (
    <main className="landing-shell" id="main-content">
      <nav className="topbar wrap">
        <Link href={homeHref} className="brand">Link<span>li</span></Link>
        <div className="nav-links">
          <a href="#templates">תבניות</a>
          <a href="#pricing">מסלולים</a>
          {user ? <Link className="button button-small button-dark" href="/studio">לעמודים שלי</Link> : <><Link href="/login">כניסה</Link><Link className="button button-small button-dark" href="/register">הרשמה חינם</Link></>}
        </div>
      </nav>

      <section className="hero wrap">
        <div className="hero-copy">
          <h1>הופכים רעיון קטן<br />לקישור ש<span className="marker">מרגיש כמו חוויה.</span></h1>
          <p>יוצרים הזמנה, הפתעה, חידון או ברכה אישית עם שאלות, אנימציות ועמוד סיום מעוצב — ומשתפים קישור שנראה מצוין בכל מכשיר.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href={startHref}>{user ? "לעמודים שלי" : "יצירת עמוד בחינם"} <span>←</span></Link>
            <a className="text-link" href="#templates">לצפייה בתבניות</a>
          </div>
          <div className="trust-row">
            <div className="avatar-stack"><i>ע</i><i>ד</i><i>נ</i><i>+</i></div>
            <span>ללא כרטיס אשראי · עמוד ראשון בתוך דקות</span>
          </div>
        </div>

        <div className="hero-stage" aria-label="תצוגה מקדימה של עמוד Linkli">
          <div className="hero-emoji-rain" aria-hidden="true"><i>💕</i><i>✨</i><i>🌸</i><i>💗</i></div>
          <div className="spark spark-one">✦</div><div className="spark spark-two">✦</div>
          <div className="phone-card">
            <div className="phone-top"><span /><span /><span /></div>
            <div className="phone-content">
              <div className="floating-emoji">💘</div>
              <p className="mini-greeting">שאלה 2 מתוך 3</p>
              <div className="mini-progress"><i /><i /><i /></div>
              <h2>מתי הכי כיף לך לצאת?</h2>
              <p>כדי שאוכל להתחיל לתכנן</p>
              <div className="mini-option active">חמישי בערב <b>✓</b></div>
              <div className="mini-option">שישי בצהריים <b>○</b></div>
              <div className="mini-option">עדיף להשאיר כהפתעה <b>○</b></div>
              <div className="mini-button">לשאלה הבאה ←</div>
            </div>
          </div>
          <div className="stat-bubble stat-views"><strong>1,248</strong><span>צפיות 👀</span></div>
          <div className="stat-bubble stat-time"><strong>2:14</strong><span>זמן יצירה ⚡</span></div>
        </div>
      </section>

      <section className="logo-strip">
        <div className="wrap strip-inner"><span>מתאים במיוחד ל־</span><b>ימי הולדת 🎂</b><b>אירועים 🥂</b><b>דייטים 💘</b><b>חברים 🤝</b></div>
      </section>

      <section className="section wrap" id="templates">
        <div className="section-heading"><div><span className="kicker">מתחילים מתבנית</span><h2>משהו לכל רגע</h2></div><p>כל תבנית מגיעה מוכנה. נשאר רק להפוך אותה לשלכם.</p></div>
        <div className="template-grid landing-templates">
          {templates.map((template, index) => (
            <article className={`template-showcase template-tone-${index + 1}`} key={template.id}>
              <Link href={`/preview/${template.id}`} className="template-art" aria-label={`תצוגה מקדימה של ${template.name}`}><span>{template.emoji}</span><i>{template.category}</i><b>תצוגה חיה</b></Link>
              <div className="template-info"><h3>{template.name}</h3><p>{template.description}</p><small>3 שאלות · אנימציות · תוצאה אישית</small><div className="template-actions"><Link href={`/preview/${template.id}`} className="template-preview-link">תצוגה מקדימה</Link><Link href={user ? `/studio/create?template=${template.id}` : `/register?returnTo=${encodeURIComponent(`/studio/create?template=${template.id}`)}`} className="template-use-link">{template.free ? "יצירה בחינם" : "יצירה עם Plus"} <span>←</span></Link></div></div>
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
        <div className="center-heading"><span className="kicker">פשוט לבחור</span><h2>המסלול שמתאים לכם</h2><p>כל כלי העריכה זמינים בשני המסלולים. Plus מוסיף עוד עמודים, את כל התבניות ועמודים ללא מיתוג Linkli.</p></div>
        <div className="pricing-grid">
          <article className="price-card"><div><span className="plan-label">חינם</span><h3>₪0 <small>/ ללא הגבלת זמן</small></h3><p>כל מה שצריך כדי ליצור ולשתף עמוד אחד.</p></div><ul><li>✓ עמוד אחד</li><li>✓ {freeTemplateCount} תבניות לבחירה</li><li>✓ עריכת טקסטים, שאלות וצבעים</li><li>✓ נתוני צפיות ולחיצות</li><li>✓ הגנה באמצעות סיסמה</li><li className="muted">כולל מיתוג Linkli</li></ul><Link href={startHref} className="button button-outline">{user ? "לעמודים שלי" : "מתחילים בחינם"}</Link></article>
          <article className="price-card featured"><div className="popular">יותר מקום ליצור</div><div><span className="plan-label">Plus</span><h3>₪9.90 <small>/ לחודש</small></h3><p>יותר עמודים, כל התבניות וללא מיתוג Linkli.</p></div><ul><li>✓ עד {PROJECT_LIMITS.plus} עמודים</li><li>✓ כל {totalTemplateCount} התבניות, כולל תבניות חדשות</li><li>✓ עריכת טקסטים, שאלות וצבעים</li><li>✓ נתוני צפיות ולחיצות</li><li>✓ הגנה באמצעות סיסמה</li><li>✓ ללא מיתוג Linkli</li></ul><Link href="/checkout" className="button button-primary">שדרוג ל־Plus <span>←</span></Link></article>
        </div>
      </section>

      <section className="final-cta wrap"><span>✦</span><h2>הרעיון כבר אצלכם.<br />בואו נהפוך אותו לעמוד שאפשר לשתף.</h2><p>העמוד הראשון שלכם יכול להיות מוכן בתוך כמה דקות.</p><Link href={startHref} className="button button-light">{user ? "חזרה לעמודים שלי" : "יצירת עמוד בחינם"} ←</Link></section>

      <footer className="footer wrap"><Link href={homeHref} className="brand">Link<span>li</span></Link><p>עמודים קטנים לרגעים גדולים.</p><div><Link href="/legal">תנאים ופרטיות</Link><Link href="/accessibility">נגישות</Link><Link href="/contact">יצירת קשר</Link></div></footer>
    </main>
  );
}
