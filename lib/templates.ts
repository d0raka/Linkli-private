import { plainText } from "./text";

export type TemplateQuestion = {
  prompt: string;
  helper: string;
  options: string[];
  correctOption: string;
};

export type TemplateTheme = "romance" | "party" | "elegant" | "playful" | "letter" | "mischief";

export type TemplateConfig = {
  recipient: string;
  headline: string;
  subtitle: string;
  introLabel: string;
  startText: string;
  highlights: string[];
  questions: TemplateQuestion[];
  finalButtonText: string;
  resultLabel: string;
  successTitle: string;
  successText: string;
  whatsapp: string;
  whatsappText: string;
  buttonText: string;
  accent: string;
  accentSoft: string;
  emoji: string;
  decorations: string[];
  theme: TemplateTheme;
  // Kept in the normalized record for compatibility with pages created before multi-step templates.
  options: string[];
  correctOption: string;
};

export type LinkliTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  free: boolean;
  config: TemplateConfig;
};

function config(value: Omit<TemplateConfig, "options" | "correctOption">): TemplateConfig {
  return { ...value, options: value.questions[0].options, correctOption: value.questions[0].correctOption };
}

export const templates: LinkliTemplate[] = [
  {
    id: "date", name: "הזמנה לדייט", category: "רומנטי", emoji: "💘", free: true,
    description: "הזמנה אישית בשלושה שלבים, עם הפתעה בסוף והמשך ישיר ל־WhatsApp.",
    config: config({
      recipient: "שירה", headline: "יש לי הצעה שקשה לסרב לה", subtitle: "הכנתי לך הזמנה קטנה, אישית וקצת מרגשת. שלוש שאלות — ואז מגלים מה תכננתי.",
      introLabel: "הזמנה אישית במיוחד", startText: "יאללה, מתחילים", highlights: ["3 שאלות קצרות", "פחות מדקה"],
      questions: [
        { prompt: "איזו אווירה מתאימה לערב שלנו?", helper: "אין תשובה לא נכונה — רק כיוון טוב להתחלה.", options: ["יין ושיחה טובה 🍷", "ארוחה במקום חדש 🍝", "משהו ספונטני לגמרי ✨", "סרט ונשנושים בבית 🍿"], correctOption: "משהו ספונטני לגמרי ✨" },
        { prompt: "מתי הכי נוח לצאת?", helper: "כדי שאוכל להתחיל לתכנן.", options: ["חמישי בערב", "שישי בצהריים", "מוצאי שבת", "עדיף להשאיר כהפתעה"], correctOption: "עדיף להשאיר כהפתעה" },
        { prompt: "אז קובעים דייט?", helper: "זה הרגע לבחור את התשובה הנכונה.", options: ["כן, בשמחה 💕", "ברור שכן", "רק אם יש קינוח", "כבר מחכה לזה"], correctOption: "כן, בשמחה 💕" },
      ],
      finalButtonText: "לגלות את ההפתעה", resultLabel: "קבענו דייט ✨",
      successTitle: "זה דייט! עכשיו זה רשמי 🥰", successText: "ידעתי שיש לי סיכוי. נשאר רק לבחור זמן ומקום ולהתחיל להתרגש.",
      whatsapp: "", whatsappText: "ראיתי את ההזמנה — בשמחה, קובעים דייט 💕", buttonText: "קובעים ב־WhatsApp",
      accent: "#ef476f", accentSoft: "#fff0f3", emoji: "💘", decorations: ["💗", "✨", "💕", "🌸"], theme: "romance",
    }),
  },
  {
    id: "birthday", name: "הפתעת יום הולדת", category: "חגיגה", emoji: "🎂", free: true,
    description: "מסלול יום הולדת חגיגי עם מסלול זיכרונות, טקס כיבוי נר אינטראקטיבי וקונפטי.",
    config: config({
      recipient: "דניאל", headline: "חוגגים לך יום הולדת 🎂", subtitle: "הכנו לך מסלול זיכרונות קצר, כיבוי נרות וברכה מהלב שאי אפשר לשכוח.",
      introLabel: "היום כולו שלך 🎉", startText: "פתיחת במסלול החגיגה", highlights: ["טקס כיבוי נר", "ברכה וקונפטי"],
      questions: [
        { prompt: "איזה רגע מהשנה החולפת הכי מטורף שחוויתם יחד?", helper: "הזיכרון שעד היום מעלה חיוך.", options: ["הטיול שכולם יזכרו ✈️", "הלילה שצחקנו עד דמעות 😂", "הערב הספונטני ההוא ✨", "כל רגע יחד ❤️"], correctOption: "כל רגע יחד ❤️" },
        { prompt: "איזה סוג חגיגה הלב שלך באמת צריך היום?", helper: "יום הולדת זה הזמן לבקש משאלות.", options: ["מסיבה מטורפת עד הבוקר 🎵", "ערב אינטימי עם אהובים 🥂", "חופשה רגועה בטבע 🌿", "אוכל טוב והמון מתנות 🎁"], correctOption: "ערב אינטימי עם אהובים 🥂" },
        { prompt: "מה המאכל שחובה שיהיה על השולחן ביומולדת הזה?", helper: "הקלוריה לא נחשבת ביום הולדת.", options: ["עוגת שוקולד מוגזמת 🎂", "פיצה רותחת 🍕", "סושי מפנק 🍱", "אלכוהול וקינוחים 🍸"], correctOption: "עוגת שוקולד מוגזמת 🎂" },
      ],
      finalButtonText: "לכיבוי הנר ופתיחת הברכה", resultLabel: "יום הולדת שמח 🎉",
      successTitle: "יום הולדת שמח! שתהיה שנה מושלמת 🎉", successText: "שתמשיך/י להאיר את העולם בחיוך שלך. שתהיה שנה מלאה בהגשמת חלומות, בריאות, אהבה וסיבות אמיתיות לחגוג!",
      whatsapp: "", whatsappText: "כיביתי את הנר ופתחתי את הברכה — איזה כיף! 🎂", buttonText: "שליחת תודה ב־WhatsApp",
      accent: "#7c3aed", accentSoft: "#f5efff", emoji: "🎂", decorations: ["🎉", "🎈", "✨", "🥳", "🎊"], theme: "party",
    }),
  },
  {
    id: "rsvp", name: "הזמנה לאירוע", category: "אירועים", emoji: "🥂", free: true,
    description: "כרטיס VIP לאירוע עם אישור הגעה, מונה אורחים, הוספה ליומן ובקשת שיר ל-DJ.",
    config: config({
      recipient: "משפחת לוי", headline: "עומר ומאיה מתחתנים", subtitle: "נשמח לחגוג איתכם ביום חמישי, 18 בספטמבר 2026. אנא אשרו הגעה בכמה צעדים קצרים.",
      introLabel: "אישור הגעה לחתונה", startText: "מילוי אישור הגעה", highlights: ["18.09.2026 · 19:30", "חוות רונית, השרון"],
      questions: [
        { prompt: "האם תגיעו לחגוג איתנו?", helper: "נשמח מאוד לראותכם ברחבה!", options: ["מגיעים לחגוג! 🥂", "עדיין לא בטוחים", "לצערנו לא נוכל להגיע"], correctOption: "" },
        { prompt: "כמה אורחים מגיעים איתכם?", helper: "כדי שנכין לכם מקום מעולה.", options: ["אורח אחד 👤", "זוג 👥", "שלושה אורחים 👨‍👩‍👧", "ארבעה אורחים ומעלה 👨‍👩‍👧‍👦"], correctOption: "" },
        { prompt: "איזה שיר חובה שה-DJ ינגן ברחבה בשבילכם?", helper: "רשמו שיר שירים אתכם באוויר!", options: ["מוזיקה מקפיצה 🎵", "להיטי מיינסטרים 🔥", "שירים ים-תיכוניים 🥁", "רגרטון ופופ 💃"], correctOption: "" },
      ],
      finalButtonText: "לאישור ואיסוף כרטיס ה-VIP", resultLabel: "אישור ההגעה התקבל",
      successTitle: "מחכים לחגוג איתכם! 🥂", successText: "תודה שמילאתם את הפרטים. האישור שלכם התקבל בהצלחה! לחצו למטה לשליחת האישור ב-WhatsApp והוספה ליומן.",
      whatsapp: "", whatsappText: "שלום! מילאנו אישור הגעה לאירוע 🥂", buttonText: "שליחת האישור ב־WhatsApp",
      accent: "#0f766e", accentSoft: "#edf9f6", emoji: "🥂", decorations: ["✨", "🥂", "🌿", "💫"], theme: "elegant",
    }),
  },
  {
    id: "friendship", name: "מבחן חברות", category: "משחק", emoji: "🤝", free: false,
    description: "אתגר חברות Buzzfeed מצחיק ופנאטי עם ניקוד ותג דרגה שניתן לשתף.",
    config: config({
      recipient: "החברים הכי טובים שלי", headline: "אתגר החברות הגדול! 🤝", subtitle: "3 שאלות קשוחות כדי לגלות מי באמת חבר אמת ומי פשוט נמצא בקבוצת הוואטסאפ.",
      introLabel: "מבחן החברות", startText: "התחלת החידון", highlights: ["3 שאלות פלפליות", "תוצאה ותג דרגה"],
      questions: [
        { prompt: "מי מאיתנו יסתבך ראשון בטיול ויצטרך שייחלצו אותו?", helper: "תשובות כנות בלבד.", options: ["ברור שאני 🤦‍♂️", "את/ה בוודאות 🤷‍♀️", "שנינו יחד באותה מידה 🚨", "אף אחד, אנחנו מקצוענים 😎"], correctOption: "ברור שאני 🤦‍♂️" },
        { prompt: "מה התירוץ הכי נפוץ כשאחד מאיתנו מאחר?", helper: "חשבו על ההודעות האחרונות בקבוצה.", options: ["'אני כבר ברכב' (עדיין בבית) 🚗", "'לא מצאתי חנייה' 🅿️", "'היה פקק מטורף' 🚦", "אני לא מאחר, אני מגיע בזמן!"], correctOption: "'אני כבר ברכב' (עדיין בבית) 🚗" },
        { prompt: "אם שנינו נשארים תקועים באי בודד, מה נעשה קודם?", helper: "מבחן ההישרדות האולטימטיבי.", options: ["נחפש אוכל ושתייה 🥥", "נבכה ונחפש קליטה 📱", "נריב על מי אשם 😅", "נקים מדינה חדשה 🏝️"], correctOption: "נחפש אוכל ושתייה 🥥" },
      ],
      finalButtonText: "לחישוב הניקוד וקבלת התג", resultLabel: "התוצאה מוכנה 🏆",
      successTitle: "עברת את אתגר החברות! 🏆", successText: "תוצאה מרשימה! אפשר להמשיך להשוויץ לכולם שאנחנו הצוות הכי חזק בסביבה.",
      whatsapp: "", whatsappText: "סיימתי את מבחן החברות! בואו תראו מה יצא לי 🤝", buttonText: "שליחת התוצאה לחברים",
      accent: "#2563eb", accentSoft: "#edf4ff", emoji: "🤝", decorations: ["⭐", "💙", "🏆", "✨"], theme: "playful",
    }),
  },
  {
    id: "love-note", name: "מכתב אהבה", category: "רומנטי", emoji: "💌", free: false,
    description: "מכתב אהבה אינטראקטיבי שנפתח במעטפת שעווה דרך 3 תחנות מרגשות.",
    config: config({
      recipient: "אהבה שלי", headline: "יש משהו שרציתי לומר לך", subtitle: "הכנתי לך מכתב אישי שנפתח דרך שלושה רגעים קטנים מהסיפור שלנו.",
      introLabel: "מכתב אישי בשבילך", startText: "פתיחת המכתב", highlights: ["3 רגעים משותפים", "מכתב אישי מהלב"],
      questions: [
        { prompt: "איזה רגע קטן שלנו תמיד מעלה לך חיוך על הפנים?", helper: "הזיכרון המשותף שלנו.", options: ["הדייט הראשון שנפגשנו ☕", "הטיול המשותף שלנו 🌅", "הבדיחה שרק שנינו מבינים 😂", "כל הרגעים הקטנים יחד ❤️"], correctOption: "כל הרגעים הקטנים יחד ❤️" },
        { prompt: "מה התכונה שהכי הופכת אותנו לצוות מנצח?", helper: "אין צורך לחשוב יותר מדי.", options: ["אנחנו תמיד מגבים אחד את השני 🛡️", "אנחנו צוחקים מכל דבר 🤣", "יש בין תמיכה והקשבה 💑", "כל אלה ועוד הרבה יותר ✨"], correctOption: "כל אלה ועוד הרבה יותר ✨" },
        { prompt: "מוכן/ה לפתוח את המכתב שנכתב במיוחד בשבילך?", helper: "מכאן המכתב נפתח במלואו.", options: ["כן, עכשיו! ❤️", "אני כבר מתרגש/ת 💖", "מכור/ה לאהבה שלך 🥰", "קדימה, לפתוח! 💌"], correctOption: "כן, עכשיו! ❤️" },
      ],
      finalButtonText: "לקריאת המכתב המלא", resultLabel: "מכתב מהלב ❤️",
      successTitle: "איתך אני בבית ❤️", successText: "תודה על כל הצחוקים, החיבוקים והרגעים הקטנים שהופכים את החיים שלנו לסיפור שאני רוצה להמשיך לקרוא כל יום מחדש.",
      whatsapp: "", whatsappText: "פתחתי את המכתב שלך וריגשת אותי עמוק ❤️", buttonText: "שליחת נשיקה ב־WhatsApp 💋",
      accent: "#db2777", accentSoft: "#fff0f7", emoji: "💌", decorations: ["❤️", "💌", "✨", "🌹"], theme: "letter",
    }),
  },
  {
    id: "prank", name: "עמוד מתיחה", category: "מצחיק", emoji: "😈", free: false,
    description: "מתיחה ויראלית רשמית עם בדיקת אבטחה מזויפת ומד התקדמות דרמטי.",
    config: config({
      recipient: "הזוכה המאושר", headline: "🔍 הודעה דחופה: בדיקת אבטחה נדרשת", subtitle: "אותר ניסיון גישה חריג למכשירך. נא להשלים את שלבי האימות כדי למנוע נעילת מערכת.",
      introLabel: "התראת אבטחה חמורה", startText: "התחלת האימות", highlights: ["אימות זהות 🔒", "סריקת מכשיר 📲"],
      questions: [
        { prompt: "האם את/ה הבעלים החוקי של מכשיר זה?", helper: "זיהוי משתמש נדרש.", options: ["כן, אני הבעלים 🙋‍♂️", "לא בטוח/ה 😅", "מה קורה כאן?! 😱", "אני מבטל/ת את זה!"], correctOption: "כן, אני הבעלים 🙋‍♂️" },
        { prompt: "איזה קוד שחזור כדאי להזניק כעת?", helper: "בחירה שגויה תגרום למחיקת נתונים. בערך.", options: ["קוד 101 🚨", "קוד 999 💥", "קוד חרום 🔴", "ביטול מיידי!"], correctOption: "קוד חרום 🔴" },
        { prompt: "ללחוץ על הכפתור האדום לביטול הנעילה?", helper: "זה הרגע לבדוק אם הדופק שלך עלה.", options: ["כן! ללחוץ מהר! 🔴", "אני בלחץ מטורף 😱", "זה אמיתי בכלל?!", "קדימה, לבטל!"], correctOption: "כן! ללחוץ מהר! 🔴" },
      ],
      finalButtonText: "לביטול הנעילה המיידית", resultLabel: "האימות הושלם",
      successTitle: "סתאאם! נפלת במתיחה 😂", successText: "עבדנו עליך! המכשיר שלך בסדר גמור. החדשות העוד יותר טובות: עכשיו תורך להעביר את המתיחה לחבר הבא!",
      whatsapp: "", whatsappText: "נפלתי במתיחה שלך חזק! 😂", buttonText: "להודות שנפלתי בפח 😈",
      accent: "#ea580c", accentSoft: "#fff3e9", emoji: "😈", decorations: ["😂", "😈", "💥", "🎁"], theme: "mischief",
    }),
  },
];

export function getTemplate(id: string) {
  return templates.find((template) => template.id === id) ?? templates[0];
}

export function safeConfig(value: unknown, templateId: string): TemplateConfig {
  const base = getTemplate(templateId).config;
  if (!value || typeof value !== "object") return structuredClone(base);
  const input = value as Partial<TemplateConfig>;
  const limitedString = (candidate: unknown, fallback: string, max: number) => {
    const normalized = plainText(candidate, max);
    return normalized || fallback;
  };
  const safeOptions = (candidate: unknown, fallback: string[]) => {
    if (!Array.isArray(candidate)) return fallback;
    const options = candidate.map((item) => plainText(item, 120, true)).filter(Boolean).slice(0, 6);
    return options.length >= 2 ? options : fallback;
  };
  const legacyOptions = safeOptions(input.options, base.questions[0].options);
  const legacyCorrect = limitedString(input.correctOption, base.questions[0].correctOption, 120);
  const sourceQuestions = Array.isArray(input.questions) ? input.questions.slice(0, 10) : [];
  const questionCount = Math.max(1, sourceQuestions.length || base.questions.length);
  const questions = Array.from({ length: questionCount }, (_, index) => {
    const fallback = base.questions[index] || base.questions[base.questions.length - 1];
    const source = sourceQuestions[index] && typeof sourceQuestions[index] === "object"
      ? sourceQuestions[index] as Partial<TemplateQuestion>
      : index === 0 ? { prompt: input.headline, helper: input.subtitle, options: legacyOptions, correctOption: legacyCorrect } : {};
    const options = safeOptions(source.options, fallback.options);
    const requestedCorrect = limitedString(source.correctOption, fallback.correctOption, 120);
    return {
      prompt: limitedString(source.prompt, fallback.prompt, 140),
      helper: limitedString(source.helper, fallback.helper, 240),
      options,
      correctOption: requestedCorrect && options.includes(requestedCorrect) ? requestedCorrect : fallback.correctOption && options.includes(fallback.correctOption) ? fallback.correctOption : "",
    };
  });
  const color = (key: "accent" | "accentSoft") => {
    const candidate = typeof input[key] === "string" ? input[key]!.trim() : "";
    return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : base[key];
  };
  return {
    recipient: limitedString(input.recipient, base.recipient, 80),
    headline: limitedString(input.headline, base.headline, 120),
    subtitle: limitedString(input.subtitle, base.subtitle, 320),
    introLabel: limitedString(input.introLabel, base.introLabel, 80),
    startText: limitedString(input.startText, base.startText, 80),
    highlights: Array.isArray(input.highlights)
      ? input.highlights.map((item) => plainText(item, 80, true)).filter(Boolean).slice(0, 2)
      : base.highlights,
    questions,
    finalButtonText: limitedString(input.finalButtonText, base.finalButtonText, 80),
    resultLabel: limitedString(input.resultLabel, base.resultLabel, 80),
    successTitle: limitedString(input.successTitle, base.successTitle, 140),
    successText: limitedString(input.successText, base.successText, 700),
    whatsapp: limitedString(input.whatsapp, base.whatsapp, 18).replace(/\D/g, "").slice(0, 15),
    whatsappText: limitedString(input.whatsappText, base.whatsappText, 500),
    buttonText: limitedString(input.buttonText, base.buttonText, 80),
    accent: color("accent"), accentSoft: color("accentSoft"),
    emoji: limitedString(input.emoji, base.emoji, 16), decorations: base.decorations, theme: base.theme,
    options: questions[0].options, correctOption: questions[0].correctOption,
  };
}
