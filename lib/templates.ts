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
    description: "הזמנה אישית בשלושה שלבים, עם מסך סיום מרגש והמשך ישיר ל־WhatsApp.",
    config: config({
      recipient: "שירה", headline: "יש לי הצעה שקשה לסרב לה", subtitle: "הכנתי לך הזמנה קטנה, אישית וקצת מרגשת. שלוש שאלות - ואז מגלים מה תכננתי.",
      introLabel: "הזמנה אישית במיוחד", startText: "מעניין אותי, מתחילים", highlights: ["3 שאלות קצרות", "פחות מדקה"],
      questions: [
        { prompt: "איזו אווירה מתאימה לערב שלנו?", helper: "אין תשובה לא נכונה - רק כיוון טוב להתחלה.", options: ["יין ושיחה טובה 🍷", "ארוחה במקום חדש 🍝", "משהו ספונטני לגמרי ✨", "סרט ונשנושים בבית 🍿"], correctOption: "משהו ספונטני לגמרי ✨" },
        { prompt: "מתי הכי נוח לצאת?", helper: "כדי שאוכל להתחיל לתכנן.", options: ["חמישי בערב", "שישי בצהריים", "מוצאי שבת", "עדיף להשאיר כהפתעה"], correctOption: "עדיף להשאיר כהפתעה" },
        { prompt: "אז קובעים דייט?", helper: "זה הרגע לבחור את התשובה הנכונה.", options: ["כן, בשמחה 💕", "ברור שכן", "רק אם יש קינוח", "כבר מחכה לזה"], correctOption: "כן, בשמחה 💕" },
      ],
      finalButtonText: "לחשיפת ההזמנה", resultLabel: "ההזמנה התקבלה ✨",
      successTitle: "זה דייט! עכשיו זה רשמי 🥰", successText: "ידעתי שיש לי סיכוי. נשאר רק לבחור זמן ומקום ולהתחיל להתרגש.",
      whatsapp: "", whatsappText: "ראיתי את ההזמנה - בשמחה, קובעים דייט 💕", buttonText: "קובעים ב־WhatsApp",
      accent: "#ef476f", accentSoft: "#fff0f3", emoji: "💘", decorations: ["💗", "✨", "💕", "🌸"], theme: "romance",
    }),
  },
  {
    id: "birthday", name: "הפתעת יום הולדת", category: "חגיגה", emoji: "🎂", free: true,
    description: "ברכת יום הולדת אינטראקטיבית עם קונפטי, שאלות אישיות ומסך הפתעה.",
    config: config({
      recipient: "דניאל", headline: "רגע, לפני שמתחילים לחגוג…", subtitle: "הכנו לך מסלול יום הולדת קצר. בסופו מחכה ברכה גדולה והמון קונפטי.",
      introLabel: "היום כולו שלך", startText: "פתיחת ההפתעה", highlights: ["ברכה אישית", "הפתעה בסיום"],
      questions: [
        { prompt: "בן כמה הלב מרגיש היום?", helper: "הגיל בתעודת הזהות לא משתתף במשחק.", options: ["18 לנצח", "25 וקצת", "צעיר ברוח", "לא סופרים ביום הולדת"], correctOption: "18 לנצח" },
        { prompt: "מה חובה בכל חגיגה טובה?", helper: "מותר לבחור רק אחת, קשה ככל שיהיה.", options: ["עוגה מוגזמת 🎂", "פלייליסט מושלם 🎵", "האנשים האהובים ❤️", "כל התשובות נכונות"], correctOption: "כל התשובות נכונות" },
        { prompt: "איזו שנה מחכה לך?", helper: "בוחרים תחזית ומגשימים אותה.", options: ["שנה של הרפתקאות", "שנה של הצלחות", "שנה של אהבה", "השנה הכי טובה עד עכשיו"], correctOption: "השנה הכי טובה עד עכשיו" },
      ],
      finalButtonText: "לפתיחת הברכה", resultLabel: "יום הולדת שמח 🎉",
      successTitle: "יום הולדת שמח! הגיע הזמן לחגוג 🎉", successText: "שתהיה שנה של רגעים גדולים, אנשים טובים והמון סיבות אמיתיות לחייך.",
      whatsapp: "", whatsappText: "פתחתי את ההפתעה - ריגשתם אותי! 🎂", buttonText: "שליחת תודה ב־WhatsApp",
      accent: "#7c3aed", accentSoft: "#f5efff", emoji: "🎂", decorations: ["🎉", "🎈", "✨", "🥳", "🎊"], theme: "party",
    }),
  },
  {
    id: "rsvp", name: "הזמנה לאירוע", category: "אירועים", emoji: "🥂", free: true,
    description: "הזמנה אלגנטית עם פרטי האירוע, אישור הגעה והעדפות אירוח.",
    config: config({
      recipient: "משפחת לוי", headline: "עומר ומאיה מתחתנים", subtitle: "נשמח לחגוג איתכם ביום חמישי, 18 בספטמבר 2026. אנא אשרו הגעה בכמה צעדים קצרים.",
      introLabel: "אישור הגעה לחתונה", startText: "מילוי אישור הגעה", highlights: ["18.09.2026 · 19:30", "חוות רונית, השרון"],
      questions: [
        { prompt: "האם תגיעו לחגוג איתנו?", helper: "אפשר לעדכן את התשובה בהמשך מול המארחים.", options: ["כן, בשמחה 🥂", "עדיין לא בטוחים", "לצערנו לא נוכל להגיע"], correctOption: "" },
        { prompt: "כמה מקומות לשמור עבורכם?", helper: "כולל כל מי שמגיע איתכם.", options: ["מקום אחד", "שני מקומות", "שלושה מקומות", "ארבעה מקומות ומעלה"], correctOption: "" },
        { prompt: "האם קיימת העדפת תזונה?", helper: "נעשה כמיטב יכולתנו להתאים את המנות.", options: ["ללא העדפה מיוחדת", "צמחוני", "טבעוני", "ללא גלוטן"], correctOption: "" },
      ],
      finalButtonText: "לסיכום אישור ההגעה", resultLabel: "הפרטים נקלטו בהצלחה",
      successTitle: "תודה על אישור ההגעה 🥂", successText: "הפרטים שמילאתם מופיעים כאן לסיכום. לחצו על הכפתור כדי לשלוח אותם למארחים.",
      whatsapp: "", whatsappText: "שלום, מילאנו את אישור ההגעה לאירוע 🥂", buttonText: "שליחת האישור ב־WhatsApp",
      accent: "#0f766e", accentSoft: "#edf9f6", emoji: "🥂", decorations: ["✨", "🥂", "🌿", "💫"], theme: "elegant",
    }),
  },
  {
    id: "friendship", name: "מבחן חברות", category: "משחק", emoji: "🤝", free: false,
    description: "חידון חברות בשלושה סיבובים, עם ניקוד ותוצאה שאפשר לשתף.",
    config: config({
      recipient: "החבר הכי טוב שלי", headline: "כמה טוב אתה באמת מכיר אותי?", subtitle: "שלושה סיבובים, בלי רמזים, ותוצאה אחת שתבדוק עד כמה אתה שם לב לפרטים.",
      introLabel: "מבחן החברות", startText: "התחלת החידון", highlights: ["3 שאלות", "תוצאה מיידית"],
      questions: [
        { prompt: "מה הדבר הראשון שאני צריך/ה בבוקר?", helper: "חברים אמיתיים לא מתלבטים.", options: ["קפה לפני הכול ☕", "עוד חמש דקות שינה", "הודעות ורכילות", "מוזיקה בפול ווליום"], correctOption: "קפה לפני הכול ☕" },
        { prompt: "איזו הצעה תמיד תשכנע אותי?", helper: "חשבו על ההודעות האחרונות שלנו.", options: ["טיול ספונטני", "ערב אוכל", "בינג׳ על הספה", "כל דבר אם אנחנו יחד"], correctOption: "כל דבר אם אנחנו יחד" },
        { prompt: "מי מאיתנו שולח יותר הודעות קוליות?", helper: "יש לנו את הנתונים, אל תנסו לעבוד עלינו.", options: ["אני", "את/ה", "שנינו באותה מידה", "אנחנו מתקשרים במקום"], correctOption: "שנינו באותה מידה" },
      ],
      finalButtonText: "לצפייה בתוצאה", resultLabel: "התוצאה מוכנה 🏆",
      successTitle: "חברות ברמה אחרת 🏆", successText: "עברת את המבחן בכבוד. אפשר להמשיך לספר לכולם שאנחנו בלתי נפרדים.",
      whatsapp: "", whatsappText: "סיימתי את מבחן החברות! 🤝", buttonText: "שליחת התוצאה",
      accent: "#2563eb", accentSoft: "#edf4ff", emoji: "🤝", decorations: ["⭐", "💙", "🏆", "✨"], theme: "playful",
    }),
  },
  {
    id: "love-note", name: "מכתב אהבה", category: "רומנטי", emoji: "💌", free: false,
    description: "מכתב אהבה אינטראקטיבי שנפתח בהדרגה דרך זיכרונות משותפים.",
    config: config({
      recipient: "אהבה שלי", headline: "יש משהו שרציתי לומר לך", subtitle: "הכנתי לך מכתב אישי שנפתח דרך שלושה רגעים קטנים מהסיפור שלנו.",
      introLabel: "מכתב אישי בשבילך", startText: "פתיחת המכתב", highlights: ["3 רגעים משותפים", "מכתב אישי בסיום"],
      questions: [
        { prompt: "איזה רגע שלנו תמיד גורם לך לחייך?", helper: "השאלה הכי קשה במכתב.", options: ["הפעם הראשונה שנפגשנו", "הטיול שלנו", "הבדיחות שרק אנחנו מבינים", "כל הרגעים הקטנים"], correctOption: "כל הרגעים הקטנים" },
        { prompt: "מה הדבר הכי טוב בנו?", helper: "אין צורך לחשוב יותר מדי.", options: ["אנחנו צוות", "אנחנו מצחיקים יחד", "תמיד יש על מי לסמוך", "כל אלה ועוד"], correctOption: "כל אלה ועוד" },
        { prompt: "רוצה לקרוא את מה שכתבתי?", helper: "מכאן המכתב נפתח במלואו.", options: ["כן, עכשיו ❤️", "אני כבר מתרגש", "רק אם זה מהלב", "אפשר לפתוח"], correctOption: "כן, עכשיו ❤️" },
      ],
      finalButtonText: "לקריאת המכתב", resultLabel: "מכתב מהלב ❤️",
      successTitle: "את/ה הבית שלי ❤️", successText: "תודה על כל הצחוקים, החיבוקים והרגעים הקטנים שהופכים את החיים שלנו לסיפור שאני רוצה להמשיך לקרוא.",
      whatsapp: "", whatsappText: "פתחתי את המכתב שלך וריגשת אותי ❤️", buttonText: "שליחת לב בחזרה",
      accent: "#db2777", accentSoft: "#fff0f7", emoji: "💌", decorations: ["❤️", "💌", "✨", "🌹"], theme: "letter",
    }),
  },
  {
    id: "prank", name: "עמוד מתיחה", category: "מצחיק", emoji: "😈", free: false,
    description: "מתיחה דיגיטלית בשלושה שלבים שנראים רשמיים - עד לטוויסט בסיום.",
    config: config({
      recipient: "הזוכה המאושר", headline: "נבחרת לקבל פרס מסתורי", subtitle: "המערכת בחרה דווקא בך. כדי לחשוף את הפרס צריך להשלים שלושה שלבים רשמיים לחלוטין. כנראה.",
      introLabel: "הודעת זכייה מיוחדת", startText: "בדיקת הזכאות", highlights: ["3 שלבי אימות", "פרס מסתורי בסיום"],
      questions: [
        { prompt: "איזה סוג פרס הכי מתאים לך?", helper: "בחירה זו תשפיע מאוד. אולי.", options: ["חופשה מפנקת", "גאדג׳ט חדש", "ארוחה זוגית", "הפרס הסודי"], correctOption: "הפרס הסודי" },
        { prompt: "בחר/י קופסה אחת", helper: "יש רק הזדמנות אחת. בערך.", options: ["קופסה 1 📦", "קופסה 2 📦", "קופסה 3 📦", "הקופסה החשודה"], correctOption: "הקופסה החשודה" },
        { prompt: "מוכנים לגלות במה זכיתם?", helper: "זה הרגע המתאים לצלם את המסך.", options: ["כן, אפשר לחשוף", "קשה להאמין", "זה באמת אמיתי?", "קדימה, לחשוף"], correctOption: "זה באמת אמיתי?" },
      ],
      finalButtonText: "לחשיפת הפרס", resultLabel: "בדיקת הזכאות הושלמה",
      successTitle: "הפרס שלך: להמשיך לחכות 😈", successText: "עבדנו עליך. החדשות הטובות: עכשיו אפשר להעביר את המתיחה לחבר הבא.",
      whatsapp: "", whatsappText: "נפלתי במתיחה שלך 😂", buttonText: "להודות שנפלתי בפח",
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
      ? input.highlights.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 80)).filter(Boolean).slice(0, 2).concat(base.highlights).slice(0, 2)
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
