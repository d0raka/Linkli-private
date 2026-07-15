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
  questions: TemplateQuestion[];
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
    description: "חוויה רומנטית בת 3 שאלות, עם חשיפה חגיגית והמשך לוואטסאפ.",
    config: config({
      recipient: "שירה", headline: "יש לי הצעה שקשה לסרב לה", subtitle: "הכנתי לך הזמנה קטנה, אישית וקצת מרגשת. שלוש שאלות — ואז מגלים מה תכננתי.",
      introLabel: "הזמנה אישית במיוחד", startText: "יאללה, מסקרן אותי",
      questions: [
        { prompt: "מה הווייב המושלם לערב שלנו?", helper: "אין תשובה לא נכונה. כמעט.", options: ["יין ושיחה טובה 🍷", "אוכל שלא מפסיקים לדבר עליו 🍝", "משהו ספונטני לגמרי ✨", "ספה, סרט ונשנושים 🍿"], correctOption: "משהו ספונטני לגמרי ✨" },
        { prompt: "מתי הכי כיף לך לצאת?", helper: "כדי שאדע מתי להתחיל לתכנן.", options: ["חמישי בערב", "שישי בצהריים", "מוצ״ש", "תפתיע/י אותי"], correctOption: "תפתיע/י אותי" },
        { prompt: "והשאלה החשובה באמת…", helper: "אפשר לנשום לפני שלוחצים.", options: ["כן, יוצאים לדייט 💕", "ברור שכן", "רק אם יש קינוח", "אני כבר מתארגנ/ת"], correctOption: "כן, יוצאים לדייט 💕" },
      ],
      successTitle: "זה דייט! עכשיו זה רשמי 🥰", successText: "ידעתי שיש לי סיכוי. נשאר רק לבחור זמן ומקום ולהתחיל להתרגש.",
      whatsapp: "972500000000", whatsappText: "ראיתי את ההזמנה… זורמ/ת על הדייט 💕", buttonText: "בואו נקבע בוואטסאפ",
      accent: "#ef476f", accentSoft: "#fff0f3", emoji: "💘", decorations: ["💗", "✨", "💕", "🌸"], theme: "romance",
    }),
  },
  {
    id: "birthday", name: "הפתעת יום הולדת", category: "חגיגה", emoji: "🎂", free: true,
    description: "מסיבת יום הולדת דיגיטלית עם קונפטי, שאלות אישיות וברכה גדולה.",
    config: config({
      recipient: "דניאל", headline: "רגע, לפני שמתחילים לחגוג…", subtitle: "הכנו לך מסלול יום הולדת קצר. בסופו מחכה ברכה גדולה והמון קונפטי.",
      introLabel: "היום כולו שלך", startText: "פותחים את ההפתעה",
      questions: [
        { prompt: "בן/בת כמה מרגישים היום?", helper: "הגיל בתעודת הזהות לא משתתף במשחק.", options: ["18 לנצח", "25 וקצת", "צעיר/ה ברוח", "לא סופרים ביום הולדת"], correctOption: "18 לנצח" },
        { prompt: "מה חובה בכל חגיגה טובה?", helper: "מותר לבחור רק אחת, קשה ככל שיהיה.", options: ["עוגה מוגזמת 🎂", "פלייליסט מושלם 🎵", "האנשים האהובים ❤️", "כל התשובות נכונות"], correctOption: "כל התשובות נכונות" },
        { prompt: "איזו שנה מחכה לך?", helper: "בוחרים תחזית ומגשימים אותה.", options: ["שנה של הרפתקאות", "שנה של הצלחות", "שנה של אהבה", "השנה הכי טובה עד עכשיו"], correctOption: "השנה הכי טובה עד עכשיו" },
      ],
      successTitle: "יום הולדת שמח! הגיע הזמן לחגוג 🎉", successText: "שתהיה שנה של רגעים גדולים, אנשים טובים והמון סיבות אמיתיות לחייך.",
      whatsapp: "972500000000", whatsappText: "פתחתי את ההפתעה, ריגשתם אותי! 🎂", buttonText: "שליחת תודה בוואטסאפ",
      accent: "#7c3aed", accentSoft: "#f5efff", emoji: "🎂", decorations: ["🎉", "🎈", "✨", "🥳", "🎊"], theme: "party",
    }),
  },
  {
    id: "rsvp", name: "הזמנה לאירוע", category: "אירועים", emoji: "🥂", free: true,
    description: "הזמנה אלגנטית שאוספת אישור הגעה, מספר אורחים והעדפת אוכל.",
    config: config({
      recipient: "חברים יקרים", headline: "נשמח לחגוג אתכם", subtitle: "כל הפרטים בדרך — לפני כן עזרו לנו להתכונן עם אישור קצר בשלושה צעדים.",
      introLabel: "Save the date", startText: "לאישור הגעה",
      questions: [
        { prompt: "תגיעו לחגוג איתנו?", helper: "אפשר לעדכן אותנו שוב בהמשך.", options: ["ברור שמגיעים! 🥂", "עדיין לא בטוח/ה", "לצערי לא הפעם"], correctOption: "" },
        { prompt: "כמה מקומות לשמור לכם?", helper: "כולל אתכם.", options: ["מקום אחד", "שני מקומות", "שלושה מקומות", "ארבעה ומעלה"], correctOption: "" },
        { prompt: "יש העדפת אוכל?", helper: "נעשה הכול כדי שיהיה טעים לכולם.", options: ["רגיל", "צמחוני", "טבעוני", "ללא גלוטן"], correctOption: "" },
      ],
      successTitle: "קיבלנו — מחכים לחגוג יחד 🥂", successText: "תודה שעזרתם לנו להתארגן. שלחו את האישור ונשמור את הפרטים.",
      whatsapp: "972500000000", whatsappText: "מילאתי אישור הגעה לאירוע 🥂", buttonText: "שליחת האישור בוואטסאפ",
      accent: "#0f766e", accentSoft: "#edf9f6", emoji: "🥂", decorations: ["✨", "🥂", "🌿", "💫"], theme: "elegant",
    }),
  },
  {
    id: "friendship", name: "מבחן חברות", category: "משחק", emoji: "🤝", free: false,
    description: "חידון חברות אמיתי עם שלושה סיבובים, ניקוד ותוצאה שאפשר לשתף.",
    config: config({
      recipient: "החבר/ה הכי טוב/ה", headline: "כמה טוב את/ה באמת מכיר/ה אותי?", subtitle: "שלושה סיבובים, אפס רמזים, ותוצאה אחת שתקבע אם אנחנו צריכים שיחת יחסינו לאן.",
      introLabel: "The bestie test", startText: "מתחילים את המבחן",
      questions: [
        { prompt: "מה הדבר הראשון שאני צריך/ה בבוקר?", helper: "חברים אמיתיים לא מתלבטים.", options: ["קפה לפני הכול ☕", "עוד חמש דקות שינה", "הודעות ורכילות", "מוזיקה בפול ווליום"], correctOption: "קפה לפני הכול ☕" },
        { prompt: "איזו תוכנית תמיד תשכנע אותי?", helper: "חשבו על ההודעות האחרונות שלנו.", options: ["טיול ספונטני", "ערב אוכל", "בינג׳ על הספה", "כל דבר אם אנחנו יחד"], correctOption: "כל דבר אם אנחנו יחד" },
        { prompt: "מי מאיתנו שולח יותר הודעות קוליות?", helper: "יש לנו את הנתונים, אל תנסו לעבוד עלינו.", options: ["אני", "את/ה", "שנינו באותה מידה", "אנחנו מתקשרים במקום"], correctOption: "שנינו באותה מידה" },
      ],
      successTitle: "חברות ברמה אחרת 🏆", successText: "עברת את המבחן בכבוד. אפשר להמשיך לספר לכולם שאנחנו בלתי נפרדים.",
      whatsapp: "972500000000", whatsappText: "סיימתי את מבחן החברות! 🤝", buttonText: "שליחת התוצאה",
      accent: "#2563eb", accentSoft: "#edf4ff", emoji: "🤝", decorations: ["⭐", "💙", "🏆", "✨"], theme: "playful",
    }),
  },
  {
    id: "love-note", name: "מכתב אהבה", category: "רומנטי", emoji: "💌", free: false,
    description: "מכתב אהבה אינטראקטיבי שנפתח לאט, עם זיכרונות ורגע חשיפה מרגש.",
    config: config({
      recipient: "אהבה שלי", headline: "יש משהו שרציתי להגיד לך", subtitle: "זה לא עוד מסר מהיר. הכנתי לך מכתב קטן שנפתח דרך שלושה רגעים שלנו.",
      introLabel: "מכתב פרטי בשבילך", startText: "פתיחת המכתב",
      questions: [
        { prompt: "איזה רגע שלנו תמיד גורם לך לחייך?", helper: "השאלה הכי קשה במכתב.", options: ["הפעם הראשונה שנפגשנו", "הטיול שלנו", "הבדיחות שרק אנחנו מבינים", "כל הרגעים הקטנים"], correctOption: "כל הרגעים הקטנים" },
        { prompt: "מה הדבר הכי טוב בנו?", helper: "אין צורך לחשוב יותר מדי.", options: ["אנחנו צוות", "אנחנו מצחיקים יחד", "תמיד יש על מי לסמוך", "כל אלה ועוד"], correctOption: "כל אלה ועוד" },
        { prompt: "מוכנ/ה לקרוא את מה שכתבתי?", helper: "מכאן כבר אין דרך חזרה.", options: ["כן, עכשיו ❤️", "אני כבר מתרגש/ת", "רק אם זה מהלב", "פתח/י לי"], correctOption: "כן, עכשיו ❤️" },
      ],
      successTitle: "את/ה הבית שלי ❤️", successText: "תודה על כל הצחוקים, החיבוקים והרגעים הקטנים שהופכים את החיים שלנו לסיפור שאני רוצה להמשיך לקרוא.",
      whatsapp: "972500000000", whatsappText: "פתחתי את המכתב שלך וריגשת אותי ❤️", buttonText: "שליחת לב בחזרה",
      accent: "#db2777", accentSoft: "#fff0f7", emoji: "💌", decorations: ["❤️", "💌", "✨", "🌹"], theme: "letter",
    }),
  },
  {
    id: "prank", name: "עמוד מתיחה", category: "מצחיק", emoji: "😈", free: false,
    description: "שלושה שלבים שנראים רציניים לגמרי — עד לטוויסט הגדול בסוף.",
    config: config({
      recipient: "הקורבן הבא", headline: "נבחרת לקבל פרס מסתורי", subtitle: "המערכת שלנו בחרה דווקא בך. כדי לחשוף את הפרס צריך להשלים שלושה שלבים מאובטחים לחלוטין.",
      introLabel: "זכייה מפתיעה", startText: "בדיקת הזכאות שלי",
      questions: [
        { prompt: "איזה סוג פרס הכי מתאים לך?", helper: "בחירה זו תשפיע מאוד. אולי.", options: ["חופשה מפנקת", "גאדג׳ט חדש", "ארוחה זוגית", "הפרס הסודי"], correctOption: "הפרס הסודי" },
        { prompt: "בחר/י קופסה אחת", helper: "יש רק הזדמנות אחת. בערך.", options: ["קופסה 1 📦", "קופסה 2 📦", "קופסה 3 📦", "הקופסה החשודה"], correctOption: "הקופסה החשודה" },
        { prompt: "מוכנ/ה לגלות במה זכית?", helper: "זה הרגע לצלם את המסך.", options: ["כן! תראו לי", "אני לא מאמינ/ה", "זה בטוח אמיתי?", "יאללה, לחשוף"], correctOption: "זה בטוח אמיתי?" },
      ],
      successTitle: "הפרס שלך: להמשיך לחכות 😈", successText: "עבדנו עליך. החדשות הטובות: עכשיו אפשר להעביר את המתיחה לחבר הבא.",
      whatsapp: "972500000000", whatsappText: "נפלתי במתיחה שלך 😂", buttonText: "להודות שנפלתי בפח",
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
    if (typeof candidate !== "string") return fallback;
    const normalized = candidate.trim().slice(0, max);
    return normalized || fallback;
  };
  const safeOptions = (candidate: unknown, fallback: string[]) => {
    if (!Array.isArray(candidate)) return fallback;
    const options = candidate.filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, 120)).filter(Boolean).slice(0, 6);
    return options.length >= 2 ? options : fallback;
  };
  const legacyOptions = safeOptions(input.options, base.questions[0].options);
  const legacyCorrect = limitedString(input.correctOption, base.questions[0].correctOption, 120);
  const sourceQuestions = Array.isArray(input.questions) ? input.questions : [];
  const questions = base.questions.map((fallback, index) => {
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
  }).slice(0, 3);
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
    questions,
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
