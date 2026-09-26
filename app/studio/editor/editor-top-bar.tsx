"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowClockwise, ArrowRight, ArrowSquareOut, Check, CheckCircle, CloudArrowUp, Copy, DotsThreeVertical, Eye, PaperPlaneTilt, Trash, UsersThree, WarningCircle, WhatsappLogo, EyeSlash } from "@phosphor-icons/react/ssr";
import type { ProjectRecord } from "@/lib/projects";
import { Button } from "@/app/ui/button";
import { Menu } from "@/app/ui/menu";
import { Badge } from "@/app/ui/status";
import type { SaveState } from "./use-page-persistence";

const SAVE_LABEL: Record<SaveState, { draft: string; live: string }> = {
  saved: { draft: "כל השינויים נשמרו", live: "העמוד מעודכן" },
  saving: { draft: "שומרים…", live: "מעדכנים…" },
  dirty: { draft: "שומרים בעוד רגע…", live: "יש שינויים שעוד לא בעמוד" },
  error: { draft: "השמירה נכשלה", live: "העדכון נכשל" },
};

export default function EditorTopBar({
  project,
  saveState,
  busy,
  shareHref,
  pageUrl,
  hasRsvp,
  onBack,
  onPreview,
  onPrimary,
  onRetry,
  onUnpublish,
  onDelete,
}: {
  project: ProjectRecord;
  saveState: SaveState;
  busy: boolean;
  shareHref: string;
  pageUrl: string;
  hasRsvp: boolean;
  onBack: () => void;
  onPreview: () => void;
  onPrimary: () => void;
  onRetry: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const live = project.published;
  const label = SAVE_LABEL[saveState][live ? "live" : "draft"];
  const primaryLabel = live ? (saveState === "saved" ? "מעודכן" : "עדכון העמוד") : "פרסום";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("העתיקו את הקישור:", pageUrl);
    }
  }

  return (
    <header className="editor-bar">
      <div className="editor-bar__start">
        <button type="button" className="ui-icon-button" onClick={onBack} aria-label="חזרה לעמודים שלי" title="חזרה לעמודים שלי">
          <ArrowRight aria-hidden="true" />
        </button>
        <div className="editor-bar__title">
          <h1>{project.title}</h1>
          <p>
            <Badge tone={live ? "success" : "neutral"} live={live}>{live ? "באוויר" : "טיוטה"}</Badge>
            <span className="editor-bar__save" data-state={saveState} role="status" aria-live="polite">
              {saveState === "saved" ? <CheckCircle aria-hidden="true" weight="fill" /> : saveState === "error" ? <WarningCircle aria-hidden="true" weight="fill" /> : <CloudArrowUp aria-hidden="true" />}
              {label}
            </span>
            {saveState === "error" ? <button type="button" className="editor-bar__retry" onClick={onRetry}><ArrowClockwise aria-hidden="true" />ניסיון נוסף</button> : null}
          </p>
        </div>
      </div>

      <div className="editor-bar__end">
        <Button variant="ghost" size="sm" onClick={onPreview} disabled={busy} icon={<Eye aria-hidden="true" />} className="editor-bar__preview">תצוגה מקדימה</Button>
        {live ? (
          <a className="ui-button editor-bar__share" data-variant="whatsapp" data-size="sm" href={shareHref} target="_blank" rel="noreferrer">
            <WhatsappLogo aria-hidden="true" weight="fill" /><span>שיתוף</span>
          </a>
        ) : null}
        <Button
          variant={live && saveState === "saved" ? "secondary" : "primary"}
          size="sm"
          onClick={onPrimary}
          disabled={busy || (live && saveState === "saved")}
          loading={busy && saveState === "saving"}
          icon={live ? (saveState === "saved" ? <Check aria-hidden="true" weight="bold" /> : <CloudArrowUp aria-hidden="true" />) : <PaperPlaneTilt aria-hidden="true" />}
        >
          {primaryLabel}
        </Button>
        <Menu className="editor-bar__more" label="עוד פעולות לעמוד" trigger={<DotsThreeVertical aria-hidden="true" size="1.25rem" weight="bold" />}>
          <button type="button" className="ui-menu__item editor-bar__menu-preview" onClick={onPreview}><Eye aria-hidden="true" />תצוגה מקדימה</button>
          {live ? <a className="ui-menu__item" href={`/p/${project.slug}`} target="_blank" rel="noreferrer"><ArrowSquareOut aria-hidden="true" />פתיחת העמוד</a> : null}
          {live ? <button type="button" className="ui-menu__item" onClick={copyLink}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? "הקישור הועתק" : "העתקת הקישור"}</button> : null}
          {hasRsvp ? <Link className="ui-menu__item" href={`/studio/${project.id}/guests`}><UsersThree aria-hidden="true" />אישורי הגעה</Link> : null}
          {live ? <button type="button" className="ui-menu__item" onClick={onUnpublish}><EyeSlash aria-hidden="true" />הורדה מהאוויר</button> : null}
          <div className="ui-menu__separator" role="separator" />
          <button type="button" className="ui-menu__item" data-tone="danger" onClick={onDelete}><Trash aria-hidden="true" />מחיקת העמוד</button>
        </Menu>
      </div>
    </header>
  );
}
