"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resumeGuidedDraftId, readBirthdayDraft, writeBirthdayDraft, type BirthdayTone } from "@/lib/guided-draft";

type Tone = BirthdayTone;

const toneCopy: Record<Tone, { label: string; icon: string; headline: (name: string) => string; result: (name: string) => string }> = {
  warm: {
    label: "חם וחגיגי",
    icon: "🎉",
    headline: (name) => `${name || "האדם המיוחד"}, היום כולו שלך`,
    result: (name) => `${name || "אהוב/ה"}, שתהיה לך שנה מלאה בסיבות לחייך`,
  },
  funny: {
    label: "קליל ומצחיק",
    icon: "🥳",
    headline: (name) => `${name || "כוכב/ת האירוע"}, שוב הצלחת להגיע ליום הזה`,
    result: (name) => `${name || "אגדה"}, התבגרת בעוד שנה. חוכמה עדיין בבדיקה`,
  },
  emotional: {
    label: "מרגש מהלב",
    icon: "💜",
    headline: (name) => `${name || "אדם יקר"}, יש אנשים שפשוט ראויים לחגיגה`,
    result: (name) => `${name || "אהוב/ה"}, תודה על כל הרגעים שהפכו לזיכרונות`,
  },
};

export default function BirthdayCreator({ signedIn }: { signedIn: boolean }) {
  const [step, setStep] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [relationship, setRelationship] = useState("");
  const [memory, setMemory] = useState("");
  const [tone, setTone] = useState<Tone>("warm");

  const copy = toneCopy[tone];
  // Personal answers stay in sessionStorage; only an opaque draft id travels through the URL.
  const [draftId, setDraftId] = useState("");
  useEffect(() => { queueMicrotask(() => {
    const id = resumeGuidedDraftId("birthday");
    const saved = readBirthdayDraft(id);
    if (saved) { setRecipient(saved.recipient); setSender(saved.sender); setRelationship(saved.relationship); setMemory(saved.memory); setTone(saved.tone); }
    setDraftId(id);
  }); }, []);
  useEffect(() => {
    if (draftId) writeBirthdayDraft(draftId, { recipient, sender, relationship, memory, tone });
  }, [draftId, memory, recipient, relationship, sender, tone]);
  const studioPath = `/studio/create?template=birthday&draft=${encodeURIComponent(draftId)}`;
  const continueHref = signedIn ? studioPath : `/register?returnTo=${encodeURIComponent(studioPath)}`;
  const canContinue = step === 0 ? recipient.trim().length >= 2 : step === 1 ? memory.trim().length >= 3 : true;

  return (
    <main className="birthday-creator-shell" id="main-content">
      <nav className="birthday-creator-nav">
        <Link href="/" className="brand">Link<span>li</span></Link>
        <Link href="/preview/birthday" className="birthday-demo-link">צפייה בדוגמה מלאה</Link>
      </nav>

      <div className="birthday-creator-layout">
        <section className="birthday-builder" aria-labelledby="birthday-creator-title">
          <div className="birthday-builder-heading">
            <span className="birthday-kicker">הפתעת יום הולדת</span>
            <h1 id="birthday-creator-title">בואו נכין משהו שאי אפשר לשלוח כהודעה רגילה.</h1>
            <p>כותבים שם וזיכרון, רואים את העמוד, ונרשמים רק אם רוצים לשמור ולשתף.</p>
          </div>

          <div className="birthday-stepper" aria-label={`שלב ${step + 1} מתוך 3`}>
            {["למי", "הסיפור שלכם", "האווירה"].map((label, index) => (
              <button type="button" key={label} className={index === step ? "active" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined} onClick={() => index < step && setStep(index)} disabled={index > step}>
                <span>{index < step ? "✓" : index + 1}</span><b>{label}</b>
              </button>
            ))}
          </div>

          <form method="post" action="/api/forms/noscript" className="birthday-form-card" onSubmit={(event) => { event.preventDefault(); if (canContinue && step < 2) setStep((current) => current + 1); }}>
            {step === 0 ? <div className="birthday-form-stage">
              <span className="birthday-stage-number">01</span>
              <h2>למי מכינים את ההפתעה?</h2>
              <p>השם יופיע בכותרת ובברכה.</p>
              <label>שם חתן או כלת יום ההולדת<input disabled={!draftId} autoFocus value={recipient} maxLength={60} placeholder="לדוגמה: דניאל" onChange={(event) => setRecipient(event.target.value)} /></label>
              <label>ממי ההפתעה? <small>לא חובה</small><input disabled={!draftId} value={sender} maxLength={60} placeholder="לדוגמה: מאיה והחברים" onChange={(event) => setSender(event.target.value)} /></label>
            </div> : null}

            {step === 1 ? <div className="birthday-form-stage">
              <span className="birthday-stage-number">02</span>
              <h2>הוסיפו פרט שרק אתם מכירים</h2>
              <p>זה ההבדל בין תבנית כללית להפתעה שמרגישה אישית.</p>
              <label>מה הקשר ביניכם? <small>לא חובה</small><input disabled={!draftId} value={relationship} maxLength={60} placeholder="חברים מהצבא, אחיות, בני זוג…" onChange={(event) => setRelationship(event.target.value)} /></label>
              <label>זיכרון או בדיחה פנימית<textarea disabled={!draftId} autoFocus value={memory} maxLength={180} placeholder="לדוגמה: הטיול שבו הלכנו לאיבוד ומצאנו את המסעדה הכי טובה בעולם" onChange={(event) => setMemory(event.target.value)} /></label>
              <small className="birthday-character-count">{memory.length}/180</small>
            </div> : null}

            {step === 2 ? <div className="birthday-form-stage">
              <span className="birthday-stage-number">03</span>
              <h2>איזו הרגשה תרצו ליצור?</h2>
              <p>אפשר להמשיך לערוך כל מילה וצבע גם אחר כך.</p>
              <div className="birthday-tone-grid" role="radiogroup" aria-label="סגנון ההפתעה">
                {(Object.entries(toneCopy) as Array<[Tone, typeof copy]>).map(([id, option]) => <button type="button" role="radio" aria-checked={tone === id} className={tone === id ? "selected" : ""} key={id} onClick={() => setTone(id)}><span>{option.icon}</span><b>{option.label}</b><i>{tone === id ? "✓" : ""}</i></button>)}
              </div>
              <div className="birthday-ready-note"><span>✓</span><p><b>הטיוטה שלכם מוכנה.</b> בשלב הבא ייפתח העורך עם השם, הזיכרון והסגנון שכבר בחרתם.</p></div>
            </div> : null}

            <div className="birthday-form-actions">
              {step > 0 ? <button type="button" className="birthday-back" onClick={() => setStep((current) => current - 1)}>חזרה</button> : <span />}
              {step < 2 ? <button type="submit" className="button button-primary" disabled={!canContinue}>המשך <span>←</span></button> : <Link className="button button-primary birthday-finish" href={continueHref}>{signedIn ? "פתיחת ההפתעה בעורך" : "שמירה והמשך בחינם"} <span>←</span></Link>}
            </div>
          </form>
          {!signedIn ? <p className="birthday-signin-note">כבר יש לכם חשבון? <Link href={`/login?returnTo=${encodeURIComponent(studioPath)}`}>כניסה והמשך מהטיוטה</Link></p> : null}
        </section>

        <aside className="birthday-live-preview" aria-label="תצוגה מקדימה של ההפתעה">
          <div className="birthday-preview-label"><span className="live-dot" /><b>ההפתעה שלכם</b><small>מתעדכנת בזמן אמת</small></div>
          <div className={`birthday-preview-card birthday-tone-${tone}`}>
            <div className="birthday-confetti" aria-hidden="true"><i>🎉</i><i>✨</i><i>🎈</i><i>🎊</i></div>
            <div className="birthday-preview-topline"><span>היום כולו שלך</span><b>Link<span>li</span></b></div>
            <div className="birthday-preview-emoji">{copy.icon}</div>
            <p className="birthday-preview-greeting">{recipient ? `שלום ${recipient},` : "שלום לך,"}</p>
            <h2>{copy.headline(recipient.trim())}</h2>
            <p className="birthday-preview-copy">{memory ? `הכנו לך מסלול קטן שמתחיל בזיכרון שלנו: ${memory}` : "הכנו לך מסלול קצר עם זיכרון משותף, הפתעה וברכה מהלב."}</p>
            <div className="birthday-preview-memory"><span>01</span><p><small>רגע ששווה לזכור</small><b>{memory || "הזיכרון המשותף שלכם יופיע כאן"}</b></p></div>
            <div className="birthday-preview-result"><small>בסוף מחכה ברכה אישית</small><b>{copy.result(recipient.trim())}</b>{sender ? <span>באהבה, {sender}</span> : null}</div>
            <Link href="/preview/birthday">פתיחת הזמנה לדוגמה <span>←</span></Link>
          </div>
          <p>זו תצוגת טעימה. בעורך תוכלו לשנות שאלות, צבעים והברכה הסופית.</p>
        </aside>
      </div>
    </main>
  );
}
