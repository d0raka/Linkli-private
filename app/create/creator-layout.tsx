import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react/ssr";
import PublishedExperience from "@/app/p/[slug]/published-experience";
import type { TemplateConfig } from "@/lib/templates";
import { Brand } from "@/app/ui/status";

export type CreatorStep = { label: string };

/** Pre-signup wizard frame: a short stepper and form beside the real invitation, updating live. */
export default function CreatorLayout({
  templateId,
  exampleHref,
  title,
  lead,
  steps,
  step,
  onStep,
  preview,
  children,
  footer,
}: {
  templateId: string;
  exampleHref: string;
  title: string;
  lead: string;
  steps: CreatorStep[];
  step: number;
  onStep: (index: number) => void;
  preview: TemplateConfig;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="creator">
      <header className="creator__header">
        <Brand href="/" />
        <Link href={exampleHref} className="creator__example">דוגמה מלאה<ArrowSquareOut aria-hidden="true" /></Link>
      </header>
      <main id="main-content" className="creator__main" tabIndex={-1}>
        <section className="creator__form" aria-labelledby="creator-title">
          <h1 id="creator-title">{title}</h1>
          <p className="creator__lead">{lead}</p>
          <ol className="creator__steps" aria-label={`שלב ${step + 1} מתוך ${steps.length}`}>
            {steps.map((item, index) => (
              <li key={item.label}>
                <button
                  type="button"
                  className={index === step ? "active" : index < step ? "complete" : ""}
                  aria-current={index === step ? "step" : undefined}
                  onClick={() => index < step && onStep(index)}
                  disabled={index > step}
                >
                  <span aria-hidden="true">{index + 1}</span>{item.label}
                </button>
              </li>
            ))}
          </ol>
          {children}
          {footer ? <div className="creator__footer">{footer}</div> : null}
        </section>
        <aside className="creator__preview" aria-label="תצוגה חיה של העמוד">
          <div className="hero-phone">
            <div className="hero-phone__screen">
              <PublishedExperience slug={`draft-${templateId}`} templateId={templateId} config={preview} showWatermark embedded previewMode trackAnalytics={false} />
            </div>
            <p className="creator__preview-note">מתעדכן תוך כדי כתיבה. בעורך אפשר לשנות כל מילה וצבע.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
