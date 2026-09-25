"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { resumeGuidedDraftId, readGuidedDraft, writeGuidedDraft, type EventDraft } from "@/lib/guided-draft";

export default function GuidedEventCreator({ template, signedIn }: { template: "event" | "wedding"; signedIn: boolean }) {
  const wedding = template === "wedding";
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<EventDraft>({ name: "", partner: "", date: "", venue: "", story: "", tone: "warm", whatsappText: "קיבלנו את ההזמנה — איזה כיף לחגוג יחד!" });
  const [draftId, setDraftId] = useState("");
  useEffect(() => { queueMicrotask(() => {
    const id = resumeGuidedDraftId(template);
    const saved = readGuidedDraft(template, id) as EventDraft | null;
    if (saved) setDraft(saved);
    setDraftId(id);
  }); }, [template]);
  useEffect(() => { if (draftId) writeGuidedDraft(template, draftId, draft); }, [template, draftId, draft]);
  const update = (key: keyof EventDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const studioPath = `/studio/create?template=${template}&draft=${encodeURIComponent(draftId)}`;
  const href = signedIn ? studioPath : `/register?returnTo=${encodeURIComponent(studioPath)}`;
  const title = wedding ? `${draft.name || "נועם"} ו${draft.partner || "יעל"} מתחתנים` : draft.name || "החגיגה שלנו";
  const ready = step === 0 ? draft.name.trim().length >= 2 && (!wedding || draft.partner.trim().length >= 2) : step === 1 ? Boolean(draft.date && draft.venue.trim()) : true;
  return <main className={`birthday-creator-shell guided-${template}`} id="main-content" dir="rtl">
    <nav className="birthday-creator-nav"><Link href="/" className="brand">Linkli</Link><Link href={`/preview/${template}`}>צפייה בהזמנה לדוגמה</Link></nav>
    <div className="birthday-creator-layout">
      <section className="birthday-builder" aria-labelledby="guided-title">
        <div className="birthday-builder-heading"><span className="birthday-kicker">{wedding ? "היום שלכם, במילים שלכם" : "כל האנשים האהובים, בקישור אחד"}</span><h1 id="guided-title">{wedding ? "מתחילים מהשמות. מגיעים עד החופה." : "יש סיבה להיפגש. בואו נזמין."}</h1><p>שלושה צעדים קצרים, ואז אפשר לדייק את ההזמנה ולשלוח בוואטסאפ.</p></div>
        <div className="birthday-stepper" aria-label={`שלב ${step + 1} מתוך 3`}>{["מי חוגגים", "מתי ואיפה", "האווירה"].map((label, index) => <button key={label} type="button" disabled={index > step} aria-current={index === step ? "step" : undefined} className={index === step ? "active" : ""} onClick={() => setStep(index)}><span>{index + 1}</span><b>{label}</b></button>)}</div>
        <form method="post" action="/api/forms/noscript" className="birthday-form-card" onSubmit={(event) => { event.preventDefault(); if (ready && step < 2) setStep(step + 1); }}>
          <div className="birthday-form-stage">
            {step === 0 && <><label>{wedding ? "השם הראשון" : "שם האירוע"}<input disabled={!draftId} autoFocus value={draft.name} maxLength={60} required minLength={2} onChange={(event) => update("name", event.target.value)} placeholder={wedding ? "נועם" : "חוגגים לאמא שישים"} /></label>{wedding && <label>השם השני<input disabled={!draftId} value={draft.partner} maxLength={60} required minLength={2} onChange={(event) => update("partner", event.target.value)} placeholder="יעל" /></label>}</>}
            {step === 1 && <><label>מתי נפגשים<input disabled={!draftId} type="datetime-local" value={draft.date} required onChange={(event) => update("date", event.target.value)} /></label><label>איפה חוגגים<input disabled={!draftId} value={draft.venue} maxLength={80} required onChange={(event) => update("venue", event.target.value)} placeholder="שם המקום או הכתובת" /></label><label>משהו אישי לאורחים<textarea disabled={!draftId} value={draft.story} maxLength={240} onChange={(event) => update("story", event.target.value)} placeholder="בדיחה פנימית, בקשה קטנה, או פשוט כמה אתם מחכים לראות אותם" /></label></>}
            {step === 2 && <><fieldset className="guided-tones"><legend>איך ההזמנה תישמע?</legend>{([["formal", wedding ? "קלאסי" : "רשמי"], ["warm", "חם"], ["casual", wedding ? "מודרני" : "קליל"]] as const).map(([tone, label]) => <label key={tone}><input disabled={!draftId} type="radio" name="tone" value={tone} checked={draft.tone === tone} onChange={() => update("tone", tone)} />{label}</label>)}</fieldset><label>הודעת השיתוף בוואטסאפ<textarea disabled={!draftId} value={draft.whatsappText} maxLength={500} onChange={(event) => update("whatsappText", event.target.value)} /></label><p>כלי אישורי הגעה, יומן וניווט נפתחים לפרסום במסלול אירוע.</p></>}
          </div>
          <div className="birthday-form-actions">{step > 0 && <button type="button" className="button button-outline" onClick={() => setStep(step - 1)}>חזרה</button>}{step < 2 ? <button type="submit" className="button button-primary" disabled={!ready}>ממשיכים</button> : <Link className="button button-primary" href={href}>להכנת ההזמנה</Link>}</div>
        </form>
      </section>
      <aside className="guided-invitation" aria-label="תצוגה של ההזמנה"><span>{wedding ? "באהבה, עם המשפחות" : "שמרו לנו ערב"}</span><h2>{title}</h2><p>{draft.story || (wedding ? "מכל האנשים בעולם, הכי נשמח לראות אתכם לידנו כשהכול מתחיל." : "נפגשים לערב עם האנשים שעושים לנו טוב.")}</p><hr/><b>{draft.venue || "המקום שלנו"}</b>{draft.date && <time>{draft.date.replace("T", " · ")}</time>}<small>ההזמנה שלכם מתחילה כאן</small></aside>
    </div>
  </main>;
}
