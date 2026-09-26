import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle, Info, WarningCircle, WarningOctagon } from "@phosphor-icons/react/ssr";

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export function Badge({ tone = "neutral", live = false, children, className = "" }: { tone?: Tone; live?: boolean; children: ReactNode; className?: string }) {
  return <span className={`ui-badge ${className}`.trim()} data-tone={tone === "neutral" ? undefined : tone} data-live={live ? "" : undefined}>{children}</span>;
}

const NOTICE_ICONS = { neutral: Info, accent: Info, success: CheckCircle, warning: WarningCircle, danger: WarningOctagon } as const;

/** Inline, contextual feedback. `danger` and `warning` are announced assertively. */
export function Notice({
  tone = "neutral",
  title,
  children,
  actions,
  className = "",
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const Icon = NOTICE_ICONS[tone];
  const urgent = tone === "danger" || tone === "warning";
  return (
    <div className={`ui-notice ${className}`.trim()} data-tone={tone === "neutral" ? undefined : tone} role={urgent ? "alert" : "status"}>
      <Icon aria-hidden="true" weight={tone === "neutral" ? "regular" : "fill"} />
      {title ? <p className="ui-notice__title">{title}</p> : null}
      {children ? <div className="ui-notice__body">{children}</div> : null}
      {actions ? <div className="ui-notice__actions">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ icon, title, children, actions }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ui-empty">
      {icon ? <span className="ui-empty__icon" aria-hidden="true">{icon}</span> : null}
      <h2 className="ui-empty__title">{title}</h2>
      {children ? <p className="ui-empty__body">{children}</p> : null}
      {actions ? <div className="ui-empty__actions">{actions}</div> : null}
    </div>
  );
}

export function PageHeader({ title, lead, actions, children }: { title: ReactNode; lead?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="ui-page-header">
      <div>
        {children}
        <h1 className="ui-page-header__title">{title}</h1>
        {lead ? <p className="ui-page-header__lead">{lead}</p> : null}
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function Brand({ href = "/", label = "Linkli, לדף הבית" }: { href?: string; label?: string }) {
  return <Link href={href} className="ui-brand" aria-label={label}>Link<span>li</span></Link>;
}
