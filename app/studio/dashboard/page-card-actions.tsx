"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowSquareOut, Check, Copy, DotsThreeVertical, Eye, PencilSimple, Trash, UsersThree, WhatsappLogo } from "@phosphor-icons/react/ssr";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatHostWhatsAppInvite, whatsappShareHref } from "@/lib/whatsapp-share";
import { PRODUCTION_ORIGIN } from "@/lib/site";
import { Button, ButtonLink } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { Menu } from "@/app/ui/menu";
import { Notice } from "@/app/ui/status";

type Props = {
  id: string;
  slug: string;
  title: string;
  headline: string;
  subtitle: string;
  emoji: string;
  published: boolean;
  hasRsvp: boolean;
  rsvpResponses: number;
};

export default function PageCardActions({ id, slug, title, headline, subtitle, emoji, published, hasRsvp, rsvpResponses }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const editHref = `/studio/${id}`;

  function pageUrl(origin = typeof window === "undefined" ? PRODUCTION_ORIGIN : window.location.origin) {
    return `${origin}/p/${slug}`;
  }

  function shareHref(origin?: string) {
    return whatsappShareHref(formatHostWhatsAppInvite({ headline, tease: subtitle, url: pageUrl(origin), emoji }));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("העתיקו את הקישור:", pageUrl());
    }
  }

  async function remove() {
    setDeleting(true);
    setError("");
    try {
      await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
      setConfirming(false);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught, "לא הצלחנו למחוק את העמוד. נסו שוב."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-card__actions">
      {published ? (
        <a className="ui-button" data-variant="whatsapp" data-size="sm" href={shareHref(PRODUCTION_ORIGIN)} target="_blank" rel="noreferrer" onClick={(event) => { event.currentTarget.href = shareHref(); }}>
          <WhatsappLogo aria-hidden="true" weight="fill" />שיתוף
        </a>
      ) : (
        <ButtonLink href={editHref} variant="primary" size="sm" icon={<PencilSimple aria-hidden="true" />}>המשך עריכה</ButtonLink>
      )}
      {published ? <ButtonLink href={editHref} size="sm" icon={<PencilSimple aria-hidden="true" />}>עריכה</ButtonLink> : null}
      {published ? (
        <Button size="sm" variant="ghost" onClick={copyLink} icon={copied ? <Check aria-hidden="true" weight="bold" /> : <Copy aria-hidden="true" />} aria-live="polite">
          {copied ? "הועתק" : "קישור"}
        </Button>
      ) : null}

      <Menu className="page-card__more" label={`עוד פעולות לעמוד ${title}`} trigger={<DotsThreeVertical aria-hidden="true" size="1.25rem" weight="bold" />}>
        {published ? <a className="ui-menu__item" href={`/p/${slug}`} target="_blank" rel="noreferrer"><ArrowSquareOut aria-hidden="true" />פתיחת העמוד</a> : null}
        <a className="ui-menu__item" href={`/studio/preview/${id}`} target="_blank" rel="noreferrer"><Eye aria-hidden="true" />תצוגה מקדימה</a>
        {hasRsvp ? <Link className="ui-menu__item" href={`/studio/${id}/guests`}><UsersThree aria-hidden="true" />אישורי הגעה{rsvpResponses ? ` (${rsvpResponses})` : ""}</Link> : null}
        <div className="ui-menu__separator" role="separator" />
        <button type="button" className="ui-menu__item" data-tone="danger" onClick={() => setConfirming(true)}><Trash aria-hidden="true" />מחיקת העמוד</button>
      </Menu>

      <Dialog
        open={confirming}
        onClose={() => !deleting && setConfirming(false)}
        role="alertdialog"
        dismissible={!deleting}
        title="למחוק את העמוד?"
        description={`״${title}״ יימחק לצמיתות, כולל הקישור, התמונות ואישורי ההגעה. קישורים שכבר נשלחו יפסיקו לעבוד.`}
        footer={<>
          <Button onClick={() => setConfirming(false)} disabled={deleting} autoFocus>ביטול</Button>
          <Button variant="danger" onClick={remove} loading={deleting} loadingLabel="מוחקים…" icon={<Trash aria-hidden="true" />}>מחיקה לצמיתות</Button>
        </>}
      >
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </Dialog>
    </div>
  );
}
