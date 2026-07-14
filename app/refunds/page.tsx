import Link from "next/link";
import LegalHeader from "@/app/legal-header";

export const metadata = { title: "ביטולים והחזרים | Linkli" };

export default function RefundsPage() {
  return <main className="legal-shell" id="main-content"><LegalHeader /><article className="legal-main"><div className="legal-card">
    <span className="kicker">בלי אותיות קטנות מפתיעות</span><h1>ביטולים והחזרים</h1><p className="updated">עודכן לאחרונה: 14 ביולי 2026</p>
    <h2>ביטול חידוש מסלול Plus</h2><p>ניתן לבטל את החידוש החודשי בכל עת דרך חשבון ספק התשלום או באמצעות <Link href="/contact?topic=billing">פנייה לשירות</Link>. לאחר הביטול, תכונות Plus יישארו פעילות בדרך כלל עד סוף תקופת החיוב שכבר שולמה.</p>
    <h2>לאחר ירידה למסלול החינמי</h2><p>עמודים מעבר למכסת המסלול החינמי לא יימחקו אוטומטית, אך ייתכן שלא ניתן יהיה לפרסם את כולם. סימן Linkli יוצג מחדש בעמודים פעילים בהתאם לתנאי המסלול החינמי.</p>
    <h2>בקשת החזר</h2><p>בקשות החזר ייבדקו לפי נסיבות המקרה, מועד הבקשה, השימוש בשירות והדין החל. אם חויבתם בטעות או שאינכם מזהים חיוב, פנו אלינו בהקדם וצירפו את כתובת הדוא״ל ואסמכתת התשלום — ללא מספר כרטיס מלא.</p>
    <div className="legal-note">אין במדיניות זו כדי לגרוע מזכויות ביטול או השבה שאינן ניתנות להתניה לפי חוק הגנת הצרכן או כל דין חל.</div>
  </div></article></main>;
}
