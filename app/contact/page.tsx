import LegalHeader from "@/app/legal-header";
import ContactForm from "./contact-form";

export const metadata = { title: "יצירת קשר | Linkli" };

export default function ContactPage() {
  return <main className="legal-shell" id="main-content"><LegalHeader /><article className="legal-main"><div className="legal-card">
    <span className="kicker">אנחנו כאן</span><h1>יצירת קשר</h1><p>שאלה על חיוב, בקשת נגישות, פרטיות או עזרה בעמוד שיצרתם? כתבו לנו דרך הטופס. אל תשלחו מספר כרטיס אשראי, סיסמה או מידע רגיש שאינו נחוץ לטיפול.</p>
    <ContactForm />
  </div></article></main>;
}
