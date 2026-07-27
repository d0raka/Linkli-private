import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import AccessibilityControls from "./accessibility-controls";
import CookieNotice from "./cookie-notice";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const title = "Linkli — הופכים רעיון לעמוד שאנשים זוכרים";
  const description = "יוצרים עמודים אינטראקטיביים לאירועים, הפתעות, חידונים ורגעים אישיים — ומשתפים באמצעות קישור אחד.";
  return {
    metadataBase: base,
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: "/og-v2.png", width: 1536, height: 1024, alt: "Linkli — חוויות אינטראקטיביות בכמה צעדים" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-v2.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <a className="skip-link" href="#main-content">דילוג לתוכן הראשי</a>
        {children}
        <AccessibilityControls />
        <CookieNotice />
      </body>
    </html>
  );
}
