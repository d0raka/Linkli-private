"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import { resumeGuidedDraftId, readBirthdayDraft, writeBirthdayDraft, type BirthdayTone } from "@/lib/guided-draft";
import { personalizeBirthday } from "@/lib/guided-personalization";
import { getTemplate, safeConfig } from "@/lib/templates";
import CreatorLayout from "../creator-layout";
import { Button } from "@/app/ui/button";

const TONES: Array<{ id: BirthdayTone; label: string; icon: string }> = [
  { id: "warm", label: "חם וחגיגי", icon: "🎉" },
  { id: "funny", label: "קליל ומצחיק", icon: "🥳" },
  { id: "emotional", label: "מרגש מהלב", icon: "💜" },
];
const STEPS = [{ label: "למי" }, { label: "הסיפור שלכם" }, { label: "האווירה" }];
const base = safeConfig(getTemplate("birthday").config, "birthday");

export default function BirthdayCreator({ signedIn }: { signedIn: boolean }) {
  const [step, setStep] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [relationship, setRelationship] = useState("");
  const [memory, setMemory] = useState("");
  const [tone, setTone] = useState<BirthdayTone>("warm");
  // Personal answers stay in sessionStorage; only an opaque draft id travels through the URL.
  const [draftId, setDraftId] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const id = resumeGuidedDraftId("birthday");
      const saved = readBirthdayDraft(id);
      if (saved) { setRecipient(saved.recipient); setSender(saved.sender); setRelationship(saved.relationship); setMemory(saved.memory); setTone(saved.tone); }
      setDraftId(id);
    });
  }, []);
  useEffect(() => {
    if (draftId) writeBirthdayDraft(draftId, { recipient, sender, relationship, memory, tone });
  }, [draftId, memory, recipient, relationship, sender, tone]);

  const preview = useMemo(
    () => safeConfig(personalizeBirthday(base, { recipient: recipient.trim() || "דניאל", sender, relationship, memory, tone }), "birthday"),
    [memory, recipient, relationship, sender, tone],
  );
  const studioPath = `/studio/create?template=birthday&draft=${encodeURIComponent(draftId)}`;
  const continueHref = signedIn ? studioPath : `/register?returnTo=${encodeURIComponent(studioPath)}`;
  const canContinue = step === 0 ? recipient.trim().length >= 2 : step === 1 ? memory.trim().length >= 3 : true;

  return (
    <CreatorLayout
      templateId="birthday"
      exampleHref="/preview/birthday"
      title="הפתעת יום הולדת שאי אפשר לשלוח כהודעה רגילה"
      lead="כותבים שם וזיכרון, רואים את העמוד מתעדכן, ונרשמים רק כשרוצים לשמור ולשלוח."
      steps={STEPS}
      step={step}
      onStep={setStep}
      preview={preview}
      footer={!signedIn ? <>כבר יש לכם חשבון? <Link href={`/login?returnTo=${encodeURIComponent(studioPath)}`}>כניסה והמשך מהטיוטה</Link></> : null}
    >
      <form method="post" action="/api/forms/noscript" className="creator__card" onSubmit={(event) => { event.preventDefault(); if (canContinue && step < 2) setStep((current) => current + 1); }}>
        {step === 0 ? (
          <fieldset className="creator__stage">
            <legend>למי מכינים את ההפתעה?</legend>
            <div className="ui-field">
              <label className="ui-label" htmlFor="birthday-recipient">שם חתן או כלת יום ההולדת</label>
              <input id="birthday-recipient" className="ui-input" disabled={!draftId} autoFocus value={recipient} maxLength={60} placeholder="לדוגמה: דניאל" onChange={(event) => setRecipient(event.target.value)} />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="birthday-sender">ממי ההפתעה? <small>(לא חובה)</small></label>
              <input id="birthday-sender" className="ui-input" disabled={!draftId} value={sender} maxLength={60} placeholder="לדוגמה: מאיה והחברים" onChange={(event) => setSender(event.target.value)} />
            </div>
          </fieldset>
        ) : null}

        {step === 1 ? (
          <fieldset className="creator__stage">
            <legend>פרט שרק אתם מכירים</legend>
            <p className="ui-hint">זה ההבדל בין תבנית כללית להפתעה שמרגישה אישית.</p>
            <div className="ui-field">
              <label className="ui-label" htmlFor="birthday-relationship">מה הקשר ביניכם? <small>(לא חובה)</small></label>
              <input id="birthday-relationship" className="ui-input" disabled={!draftId} value={relationship} maxLength={60} placeholder="חברים מהצבא, אחיות, בני זוג" onChange={(event) => setRelationship(event.target.value)} />
            </div>
            <div className="ui-field">
              <label className="ui-label" htmlFor="birthday-memory">זיכרון או בדיחה פנימית</label>
              <textarea id="birthday-memory" className="ui-input" disabled={!draftId} autoFocus value={memory} maxLength={180} placeholder="לדוגמה: הטיול שבו הלכנו לאיבוד ומצאנו את המסעדה הכי טובה בעולם" onChange={(event) => setMemory(event.target.value)} aria-describedby="birthday-memory-count" />
              <p className="ui-hint creator__count" id="birthday-memory-count">{memory.length}/180</p>
            </div>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset className="creator__stage">
            <legend>איזו הרגשה תרצו ליצור?</legend>
            <div className="creator__choices" role="radiogroup" aria-label="סגנון ההפתעה">
              {TONES.map((option) => (
                <label key={option.id} className="creator__choice">
                  <input type="radio" name="tone" value={option.id} checked={tone === option.id} onChange={() => setTone(option.id)} />
                  <span aria-hidden="true">{option.icon}</span>{option.label}
                </label>
              ))}
            </div>
            <p className="ui-hint">בשלב הבא ייפתח העורך עם השם, הזיכרון והסגנון שבחרתם.</p>
          </fieldset>
        ) : null}

        <div className="creator__actions">
          {step > 0 ? <Button variant="ghost" onClick={() => setStep((current) => current - 1)}>חזרה</Button> : <span />}
          {step < 2
            ? <Button type="submit" variant="primary" disabled={!canContinue} iconEnd={<ArrowLeft aria-hidden="true" />}>המשך</Button>
            : <Link className="ui-button" data-variant="primary" href={continueHref}>{signedIn ? "פתיחת ההפתעה בעורך" : "שמירה והמשך בחינם"}<ArrowLeft aria-hidden="true" /></Link>}
        </div>
      </form>
    </CreatorLayout>
  );
}
