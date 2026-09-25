import type { Metadata } from "next";
import { headers } from "next/headers";
import "./styles/tokens.css";
import "./globals.css";
import "./styles/marketing.css";
import "./styles/experience.css";
import AccessibilityControls from "./accessibility-controls";
import CookieNotice from "./cookie-notice";
import ReferralCapture from "./referral-capture";
import { canonicalOrigin } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  // Only development follows the request host; everywhere else the canonical origin is fixed.
  const base = new URL(canonicalOrigin(requestHeaders.get("host") || "localhost:3000"));
  const title = "Linkli — הופכים רגע מיוחד לקישור שאי אפשר להתעלם ממנו";
  const description = "במקום הודעה שנעלמת בקבוצה — קישור שנפתח כעמוד. דייט, יום הולדת, חתונה. שולחים בוואטסאפ.";
  return {
    metadataBase: base,
    title,
    description,
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.png", type: "image/png", sizes: "64x64" }
      ],
      apple: [{ url: "/icon.svg" }]
    },
    openGraph: { title, description, type: "website", images: [{ url: "/og-marketing.jpg", width: 1200, height: 630, alt: "Linkli — עמוד קטן, רגע גדול" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-marketing.jpg"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <a className="skip-link" href="#main-content">דילוג לתוכן הראשי</a>
        <ReferralCapture />
        {children}
        <AccessibilityControls />
        <CookieNotice />
      </body>
    </html>
  );
}
