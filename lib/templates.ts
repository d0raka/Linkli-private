export type TemplateConfig = {
  recipient: string;
  headline: string;
  subtitle: string;
  options: string[];
  correctOption: string;
  successTitle: string;
  successText: string;
  whatsapp: string;
  whatsappText: string;
  buttonText: string;
  accent: string;
  accentSoft: string;
  emoji: string;
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

export const templates: LinkliTemplate[] = [
  {
    id: "date", name: "הזמנה לדייט", category: "רומנטי", emoji: "💘", free: true,
    description: "הזמנה אינטראקטיבית עם תשובה נכונה והמשך לוואטסאפ.",
    config: {
      recipient: "שירה", headline: "מה בא לך לעשות?", subtitle: "בחרי תשובה אחת 👇",
      options: ["לצאת איתי לדייט 💕", "להעמיד פנים שלא ראיתי 😅", "לחשוב על זה", "להפתיע אותי"],
      correctOption: "לצאת איתי לדייט 💕", successTitle: "יששש! קבענו 🥰",
      successText: "לחצי למטה ונקבע זמן שמתאים לשנינו.", whatsapp: "972500000000",
      whatsappText: "היי, זורמת על הדייט! 💕", buttonText: "בואו נקבע בוואטסאפ",
      accent: "#ef476f", accentSoft: "#ffe5ec", emoji: "💘",
    },
  },
  {
    id: "birthday", name: "הפתעת יום הולדת", category: "חגיגה", emoji: "🎂", free: true,
    description: "ברכה צבעונית שנפתחת כהפתעה אישית.",
    config: {
      recipient: "דניאל", headline: "יש לנו משהו קטן בשבילך", subtitle: "אבל קודם — בן/בת כמה מרגישים היום?",
      options: ["18 לנצח", "25 וקצת", "צעיר/ה ברוח", "לא סופרים"], correctOption: "18 לנצח",
      successTitle: "יום הולדת שמח! 🎉", successText: "שתהיה שנה של רגעים גדולים, אנשים טובים והמון סיבות לחייך.",
      whatsapp: "972500000000", whatsappText: "ראיתי את ההפתעה, תודה! 🎂", buttonText: "שליחת תודה בוואטסאפ",
      accent: "#7c3aed", accentSoft: "#f0e8ff", emoji: "🎂",
    },
  },
  {
    id: "rsvp", name: "הזמנה לאירוע", category: "אירועים", emoji: "🥂", free: true,
    description: "עמוד הזמנה קצר עם אישור הגעה מהיר.",
    config: {
      recipient: "חברים יקרים", headline: "חוגגים איתנו?", subtitle: "נשמח לדעת אם אתם מגיעים",
      options: ["ברור שמגיעים!", "מגיע/ה לבד", "מגיעים בזוג", "עדיין לא בטוח/ה"], correctOption: "ברור שמגיעים!",
      successTitle: "איזה כיף! נתראה שם 🥂", successText: "שלחו לנו אישור קצר כדי שנשמור לכם מקום.",
      whatsapp: "972500000000", whatsappText: "אנחנו מגיעים לאירוע 🥂", buttonText: "אישור הגעה בוואטסאפ",
      accent: "#0f766e", accentSoft: "#dff8f3", emoji: "🥂",
    },
  },
  {
    id: "friendship", name: "מבחן חברות", category: "משחק", emoji: "🤝", free: false,
    description: "חידון קטן ומצחיק שרק חברים אמיתיים יפתרו.",
    config: {
      recipient: "החבר/ה הכי טוב/ה", headline: "כמה טוב את/ה מכיר/ה אותי?", subtitle: "שאלה אחת. בלי רמאויות.",
      options: ["קפה לפני הכול", "שינה לפני הכול", "טיול ספונטני", "כל התשובות נכונות"], correctOption: "כל התשובות נכונות",
      successTitle: "חברות ברמה אחרת 🏆", successText: "ידענו שאפשר לסמוך עליך.", whatsapp: "972500000000",
      whatsappText: "עברתי את מבחן החברות! 🤝", buttonText: "שליחת ההוכחה",
      accent: "#2563eb", accentSoft: "#e1ecff", emoji: "🤝",
    },
  },
  {
    id: "love-note", name: "מכתב אהבה", category: "רומנטי", emoji: "💌", free: false,
    description: "מכתב דיגיטלי אישי עם רגע חשיפה מרגש.",
    config: {
      recipient: "אהבה שלי", headline: "יש משהו שרציתי להגיד לך", subtitle: "מוכנ/ה לפתוח את המכתב?",
      options: ["כן, עכשיו", "רק אם זה מרגש", "אני כבר סקרנ/ית", "פתח/י לי"], correctOption: "כן, עכשיו",
      successTitle: "את/ה הבית שלי ❤️", successText: "תודה על כל הצחוקים, החיבוקים והרגעים הקטנים שהופכים הכול לגדול.",
      whatsapp: "972500000000", whatsappText: "פתחתי את המכתב שלך ❤️", buttonText: "שליחת לב בחזרה",
      accent: "#db2777", accentSoft: "#fce7f3", emoji: "💌",
    },
  },
  {
    id: "prank", name: "עמוד מתיחה", category: "מצחיק", emoji: "😈", free: false,
    description: "בחירה תמימה שמסתיימת בטוויסט ובשיתוף.",
    config: {
      recipient: "הקורבן הבא", headline: "זכית בפרס מסתורי", subtitle: "בחר/י את הקופסה עם הפרס הגדול",
      options: ["קופסה 1", "קופסה 2", "קופסה 3", "הפרס הסודי"], correctOption: "הפרס הסודי",
      successTitle: "הפרס שלך: להמשיך לחכות 😈", successText: "עבדנו עליך. לפחות אפשר להעביר את זה לחבר הבא.",
      whatsapp: "972500000000", whatsappText: "נפלתי במתיחה שלך 😂", buttonText: "להודות שנפלתי בפח",
      accent: "#ea580c", accentSoft: "#ffedd5", emoji: "😈",
    },
  },
];

export function getTemplate(id: string) {
  return templates.find((template) => template.id === id) ?? templates[0];
}

export function safeConfig(value: unknown, templateId: string): TemplateConfig {
  const base = getTemplate(templateId).config;
  if (!value || typeof value !== "object") return structuredClone(base);
  const input = value as Partial<TemplateConfig>;
  const string = (key: keyof TemplateConfig) => typeof input[key] === "string" ? input[key] as string : base[key] as string;
  const options = Array.isArray(input.options)
    ? input.options.filter((item): item is string => typeof item === "string").slice(0, 6)
    : base.options;
  return {
    recipient: string("recipient"), headline: string("headline"), subtitle: string("subtitle"),
    options: options.length >= 2 ? options : base.options, correctOption: string("correctOption"),
    successTitle: string("successTitle"), successText: string("successText"), whatsapp: string("whatsapp").replace(/\D/g, ""),
    whatsappText: string("whatsappText"), buttonText: string("buttonText"), accent: string("accent"),
    accentSoft: string("accentSoft"), emoji: string("emoji"),
  };
}
