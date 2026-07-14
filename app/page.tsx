import Link from "next/link";
import { templates } from "@/lib/templates";

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <nav className="topbar wrap">
        <Link href="/" className="brand"><span>li</span>Link</Link>
        <div className="nav-links">
          <a href="#templates">תבניות</a>
          <a href="#pricing">מחירים</a>
          <Link className="button button-small button-dark" href="/studio">מתחילים ליצור</Link>
        </div>
      </nav>

      <section className="hero wrap">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> חדש: תבניות אינטראקטיביות בעברית</div>
          <h1>הופכים רעיון קטן<br />ללינק ש<span className="marker">מרגיש גדול.</span></h1>
          <p>יוצרים הזמנה, הפתעה, חידון או ברכה אישית — ושולחים עמוד יפה שעובד מיד. בלי לדעת לבנות אתרים.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/studio">יצירת עמוד בחינם <span>←</span></Link>
            <a className="text-link" href="#templates">לצפייה בתבניות</a>
          </div>
          <div className="trust-row">
            <div className="avatar-stack"><i>ע</i><i>ד</i><i>נ</i><i>+</i></div>
            <span>בלי כרטיס אשראי · מפרסמים בדקה</span>
          </div>
        </div>

        <div className="hero-stage" aria-label="תצוגה מקדימה של עמוד Linkli">
          <div className="spark spark-one">✦</div><div className="spark spark-two">✦</div>
          <div className="phone-card">
            <div className="phone-top"><span /><span /><span /></div>
            <div className="phone-content">
              <div className="floating-emoji">💘</div>
              <p className="mini-greeting">היי שירה!</p>
              <h2>מה בא לך לעשות?</h2>
              <p>בחרי תשובה אחת 👇</p>
              <div className="mini-option active">לצאת איתי לדייט 💕 <b>●</b></div>
              <div className="mini-option">להעמיד פנים שלא ראיתי <b>○</b></div>
              <div className="mini-option">להפתיע אותי <b>○</b></div>
              <div className="mini-button">שליחה</div>
            </div>
          </div>
          <div className="stat-bubble stat-views"><strong>1,248</strong><span>פתיחות 👀</span></div>
          <div className="stat-bubble stat-time"><strong>2:14</strong><span>דקות ליצירה ⚡</span></div>
        </div>
      </section>

      <section className="logo-strip">
        <div className="wrap strip-inner"><span>מתאים במיוחד ל־</span><b>ימי הולדת 🎂</b><b>אירועים 🥂</b><b>דייטים 💘</b><b>חברים 🤝</b></div>
      </section>

      <section className="section wrap" id="templates">
        <div className="section-heading"><div><span className="kicker">מתחילים מתבנית</span><h2>משהו לכל רגע</h2></div><p>כל תבנית מגיעה מוכנה. נשאר רק להפוך אותה לשלכם.</p></div>
        <div className="template-grid landing-templates">
          {templates.map((template, index) => (
            <Link href={`/studio?template=${template.id}`} className={`template-showcase template-tone-${index + 1}`} key={template.id}>
              <div className="template-art"><span>{template.emoji}</span><i>{template.category}</i></div>
              <div className="template-info"><h3>{template.name}</h3><p>{template.description}</p><b>{template.free ? "בחינם" : "Plus"} <span>←</span></b></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section how-section">
        <div className="wrap">
          <div className="center-heading"><span className="kicker">פשוט. ממש פשוט.</span><h2>שלושה צעדים ויש לכם לינק</h2></div>
          <div className="steps-grid">
            <article><span>01</span><div>🧩</div><h3>בוחרים תבנית</h3><p>מתחילים מהסגנון שמתאים לרגע שלכם.</p></article>
            <article><span>02</span><div>✍️</div><h3>הופכים אותה לשלכם</h3><p>מעדכנים טקסטים, צבעים והפעולה הרצויה.</p></article>
            <article><span>03</span><div>🚀</div><h3>מפרסמים ומשתפים</h3><p>מקבלים לינק נקי שמוכן לוואטסאפ ולרשתות.</p></article>
          </div>
        </div>
      </section>

      <section className="section wrap" id="pricing">
        <div className="center-heading"><span className="kicker">מחיר קטן. אפקט גדול.</span><h2>בוחרים את הקצב שלכם</h2><p>מתחילים חינם ומשדרגים רק כשרוצים יותר.</p></div>
        <div className="pricing-grid">
          <article className="price-card"><div><span className="plan-label">חינם</span><h3>₪0 <small>/ לתמיד</small></h3><p>כדי לנסות, לשתף ולהתחיל ליצור.</p></div><ul><li>✓ עמוד אחד מפורסם</li><li>✓ 3 תבניות בסיס</li><li>✓ התאמת טקסטים וצבעים</li><li>✓ סטטיסטיקת פתיחות</li><li className="muted">— כולל סימן Linkli</li></ul><Link href="/studio" className="button button-outline">מתחילים בחינם</Link></article>
          <article className="price-card featured"><div className="popular">הכי משתלם</div><div><span className="plan-label">Plus</span><h3>₪9.90 <small>/ לחודש</small></h3><p>ליוצרים שרוצים שהלינק יהיה באמת שלהם.</p></div><ul><li>✓ עד 10 עמודים מפורסמים</li><li>✓ כל התבניות, כולל חדשות</li><li>✓ בלי סימן מים</li><li>✓ נתוני פתיחות ולחיצות</li><li>✓ צבעים ומיתוג מלאים</li></ul><Link href="/studio?upgrade=1" className="button button-primary">מתחילים עם Plus <span>←</span></Link></article>
        </div>
      </section>

      <section className="final-cta wrap"><span>✦</span><h2>הרעיון כבר אצלכם.<br />בואו נהפוך אותו ללינק.</h2><p>העמוד הראשון שלכם יכול להיות באוויר בעוד כמה דקות.</p><Link href="/studio" className="button button-light">יצירת עמוד בחינם ←</Link></section>

      <footer className="footer wrap"><Link href="/" className="brand"><span>li</span>Link</Link><p>עמודים קטנים לרגעים גדולים.</p><div><a href="#pricing">מחירים</a><Link href="/studio">כניסה לסטודיו</Link></div></footer>
    </main>
  );
}
