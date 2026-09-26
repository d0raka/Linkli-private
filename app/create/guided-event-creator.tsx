"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import { resumeGuidedDraftId, readGuidedDraft, writeGuidedDraft, type EventDraft } from "@/lib/guided-draft";
import { personalizeEvent } from "@/lib/guided-personalization";
import { getTemplate, safeConfig } from "@/lib/templates";
import CreatorLayout from "./creator-layout";
import { Button } from "@/app/ui/button";

const STEPS = [{ label: "מי חוגגים" }, { label: "מתי ואיפה" }, { label: "האווירה" }];

export default function GuidedEventCreator({ template, signedIn }: { template: "event" | "wedding"; signedIn: boolean }) {
  const wedding = template === "wedding";
  const base = useMemo(() => safeConfig(getTemplate(template).config, template), [template]);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<EventDraft>({ name: "", partner: "", date: "", venue: "", story: "", tone: "warm", whatsappText: "קיבלנו את ההזמנה. איזה כיף לחגוג יחד!" });
  const [draftId, setDraftId] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const id = resumeGuidedDraftId(template);
      const saved = readGuidedDraft(template, id) as EventDraft | null;
      if (saved) setDraft(saved);
      setDraftId(id);
    });
  }, [template]);
  useEffect(() => { if (draftId) writeGuidedDraft(template, draftId, draft); }, [template, draftId, draft]);

  const update = (key: keyof EventDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const preview = useMemo(() => {
    const sample: EventDraft = {
      ...draft,
      name: draft.name.trim() || (wedding ? "נועם" : "החגיגה שלנו"),
      partner: draft.partner.trim() || "יעל",
      venue: draft.venue.trim() || base.venueName || "",
    };
    return safeConfig(personalizeEvent(base, sample, template).config, template);
  }, [base, draft, template, wedding]);
  const studioPath = `/studio/create?template=${template}&draft=${encodeURIComponent(draftId)}`;
  const href = signedIn ? studioPath : `/register?returnTo=${encodeURIComponent(studioPath)}`;
  const ready = step === 0
    ? draft.name.trim().length >= 2 && (!wedding || draft.partner.trim().length >= 2)
    : step === 1 ? Boolean(draft.date && draft.venue.trim()) : true;
  const tones = [["formal", wedding ? "קלאסי" : "רשמי"], ["warm", "חם"], ["casual", wedding ? "מודרני" : "קליל"]] as const;

  return (
    <CreatorLayout
      templateId={template}
      exampleHref={`/preview/${template}`}
      title={wedding ? "מתחילים מהשמות, מגיעים עד החופה" : "יש סיבה להיפגש? בואו נזמין"}
      lead="שלושה צעדים קצרים, ואז אפשר לדייק את ההזמנה בעורך ולשלוח בוואטסאפ."
      steps={STEPS}
      step={step}
      onStep={setStep}
      preview={preview}
      footer={!signedIn ? <>כבר יש לכם חשבון? <Link href={`/login?returnTo=${encodeURIComponent(studioPath)}`}>כניסה והמשך מהטיוטה</Link></> : null}
    >
      <form method="post" action="/api/forms/noscript" className="creator__card" onSubmit={(event) => { event.preventDefault(); if (ready && step < 2) setStep(step + 1); }}>
        {step === 0 ? (
          <fieldset className="creator__stage">
            <legend>{wedding ? "מי מתחתנים?" : "מה חוגגים?"}</legend>
            <div className="ui-field">
              <label className="ui-label" htmlFor="event-name">{wedding ? "השם הראשון" : "שם האירוע"}</label>
              <input id="event-name" className="ui-input" disabled={!draftId} autoFocus value={draft.name} maxLength={60} required minLength={2} onChange={(event) => update("name", event.target.value)} placeholder={wedding ? "נועם" : "חוגגים לאמא שישים"} />
            </div>
            {wedding ? (
              <div className="ui-field">
                <label className="ui-label" htmlFor="event-partner">השם השני</label>
                <input id="event-partner" className="ui-input" disabled={!draftId} value={draft.partner} maxLength={60} required minLength={2} onChange={(event) => update("partner", event.target.value)} placeholder="יעל" />
              </div>
            ) : null}
          </fieldset>
        ) : null}

        {step === 1 ? (
          <fieldset className="creator__stage">
            <legend>מתי ואיפה?</legend>
            <div className="ui-field">
              <label className="ui-label" htmlFor="event-date">מתי נפגשים</label>
              <input id="event-date" className="ui-input" disabled={!draftId} type="datetime-local" value={draft.date} required onChange={(event) => update("date", event.target.value)} />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="event-venue">איפה חוגגים</label>
              <input id="event-venue" className="ui-input" disabled={!draftId} value={draft.venue} maxLength={80} required onChange={(event) => update("venue", event.target.value)} placeholder="שם המקום או הכתובת" />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="event-story">משהו אישי לאורחים <small>(לא חובה)</small></label>
              <textarea id="event-story" className="ui-input" disabled={!draftId} value={draft.story} maxLength={240} onChange={(event) => update("story", event.target.value)} placeholder="בדיחה פנימית, בקשה קטנה, או פשוט כמה אתם מחכים לראות אותם" />
            </div>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset className="creator__stage">
            <legend>איך ההזמנה תישמע?</legend>
            <div className="creator__choices" role="radiogroup" aria-label="סגנון ההזמנה">
              {tones.map(([tone, label]) => (
                <label key={tone} className="creator__choice">
                  <input type="radio" name="tone" value={tone} disabled={!draftId} checked={draft.tone === tone} onChange={() => update("tone", tone)} />
                  {label}
                </label>
              ))}
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="event-reply">ההודעה שהאורחים ישלחו לכם בסוף</label>
              <textarea id="event-reply" className="ui-input" disabled={!draftId} value={draft.whatsappText} maxLength={500} onChange={(event) => update("whatsappText", event.target.value)} />
            </div>
            <p className="ui-hint">אישורי הגעה, יומן וניווט זמינים לפרסום במסלול אירוע.</p>
          </fieldset>
        ) : null}

        <div className="creator__actions">
          {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>חזרה</Button> : <span />}
          {step < 2
            ? <Button type="submit" variant="primary" disabled={!ready} iconEnd={<ArrowLeft aria-hidden="true" />}>ממשיכים</Button>
            : <Link className="ui-button" data-variant="primary" href={href}>להכנת ההזמנה<ArrowLeft aria-hidden="true" /></Link>}
        </div>
      </form>
    </CreatorLayout>
  );
}
