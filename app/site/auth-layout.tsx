import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { getTemplate } from "@/lib/templates";
import { Brand } from "@/app/ui/status";
import "./auth.css";

const SHOWCASE = ["wedding", "birthday", "date"];

/** Sign-in, sign-up and recovery screens: one focused form, with real invitation thumbnails beside it. */
export default function AuthLayout({ title, lead, children, footer }: { title: string; lead?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="auth">
      <header className="auth__header">
        <Brand href="/" />
        <Link href="/" className="auth__home">לדף הבית</Link>
      </header>
      <main id="main-content" className="auth__main" tabIndex={-1}>
        <section className="auth__panel" aria-labelledby="auth-title">
          <h1 id="auth-title">{title}</h1>
          {lead ? <p className="auth__lead">{lead}</p> : null}
          <div className="auth__body">{children}</div>
          {footer ? <div className="auth__footer">{footer}</div> : null}
        </section>
        <div className="auth__showcase" aria-hidden="true">
          {SHOWCASE.map((id) => {
            const template = getTemplate(id);
            return (
              <div key={id} className="auth__card" style={{ "--thumb-accent": template.config.accent, "--thumb-soft": template.config.accentSoft } as CSSProperties}>
                <span className="auth__card-emoji">{template.emoji}</span>
                <span className="auth__card-headline">{template.config.headline}</span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
