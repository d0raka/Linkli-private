import type { BirthdayDraft, EventDraft } from "./guided-draft";
import type { TemplateConfig } from "./templates";

/** Applies the pre-signup birthday wizard answers to a freshly created birthday page. */
export function personalizeBirthday(config: TemplateConfig, draft: BirthdayDraft): TemplateConfig {
  const recipient = draft.recipient.trim() || config.recipient;
  const memory = draft.memory.trim();
  const sender = draft.sender.trim();
  const toneCopy = draft.tone === "funny"
    ? { headline: `${recipient}, שוב הצלחת להגיע ליום הזה 🥳`, title: `${recipient}, התבגרת בעוד שנה. חוכמה עדיין בבדיקה`, text: "מאחלים לך שנה עם פחות דרמות, יותר עוגה והמון סיפורים שאסור לספר בקבוצה המשפחתית." }
    : draft.tone === "emotional"
      ? { headline: `${recipient}, יש אנשים שפשוט ראויים לחגיגה 💜`, title: `${recipient}, תודה על כל הרגעים שהפכו לזיכרונות`, text: "מאחלים לך שנה מלאה באנשים שרואים אותך באמת, ברגעים קטנים שעושים טוב ובחלומות שמקבלים מקום." }
      : { headline: `${recipient}, היום כולו שלך 🎉`, title: `${recipient}, שתהיה לך שנה מלאה בסיבות לחייך`, text: "מאחלים לך שנה של בריאות, אהבה, הפתעות טובות והמון רגעים ששווה לשמור קרוב ללב." };
  const signature = sender ? ` באהבה, ${sender}.` : "";
  const relationship = draft.relationship.trim();
  const relationshipCopy = relationship ? `בתור ${relationship}, רצינו להכין לך משהו קצת אחר.` : "רצינו להכין לך משהו קצת אחר.";
  const firstQuestion = config.questions[0];
  const memoryOptions = memory ? [memory, ...firstQuestion.options.filter((option) => option !== memory)].slice(0, 4) : firstQuestion.options;
  return {
    ...config,
    recipient,
    headline: toneCopy.headline,
    subtitle: `${relationshipCopy} שלושה רגעים קטנים ואז מחכה ברכה מהלב.`,
    questions: config.questions.map((question, index) => index === 0 ? { ...question, prompt: "איזה רגע שלנו תמיד מצליח להעלות חיוך?", options: memoryOptions } : question),
    successTitle: toneCopy.title,
    successText: `${toneCopy.text}${memory ? ` ותודה במיוחד על הרגע שלא נשכח: ${memory}.` : ""}${signature}`,
    whatsappText: draft.whatsappText || `פתחתי את ההפתעה שהכנתם לי. ריגשתם אותי! 🎂${sender ? ` תודה ${sender}` : ""}`,
  };
}

const EVENT_TONE_COPY: Record<EventDraft["tone"], { subtitle: string; accent: string }> = {
  formal: { subtitle: "נשמח לכבד אתכם בנוכחותכם ביום שמחתנו.", accent: "#66513c" },
  warm: { subtitle: "מחכים לחגוג יחד עם כל האנשים האהובים.", accent: "#875346" },
  casual: { subtitle: "מפנים ערב, באים רעבים, וחוגגים ביחד.", accent: "#325c80" },
};

/** Applies the pre-signup event or wedding wizard answers to a freshly created invitation. */
export function personalizeEvent(config: TemplateConfig, draft: EventDraft, template: "event" | "wedding"): { title: string; config: TemplateConfig } {
  const headline = template === "wedding" ? `${draft.name} ו${draft.partner} מתחתנים` : draft.name;
  const tone = EVENT_TONE_COPY[draft.tone] || EVENT_TONE_COPY.warm;
  return {
    title: headline.slice(0, 80),
    config: {
      ...config,
      headline,
      recipient: "",
      eventStartsAt: draft.date,
      eventDate: "",
      eventEndsAt: "",
      venueName: draft.venue,
      subtitle: draft.story || tone.subtitle,
      whatsappText: draft.whatsappText || config.whatsappText,
      accent: tone.accent,
    },
  };
}

export function birthdayTitle(draft: BirthdayDraft) {
  return `הפתעת יום הולדת ל${draft.recipient.trim()}`.slice(0, 80);
}
