import type { Metadata } from "next";
import SiteShell, { ContentPage } from "@/app/site/site-shell";
import ContactForm from "./contact-form";

export const metadata: Metadata = { title: "יצירת קשר | Linkli", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <SiteShell>
      <ContentPage
        title="יצירת קשר"
        lead={<>שאלה על תשלום, בקשת נגישות, פרטיות או עזרה עם עמוד? כתבו כאן או ל־<a href="mailto:info@linkli.online">info@linkli.online</a>. אנחנו עונים בדרך כלל תוך יום עסקים. אל תשלחו מספר כרטיס אשראי או סיסמה.</>}
      >
        <ContactForm />
      </ContentPage>
    </SiteShell>
  );
}
