import { safeNavigationUrl } from "./safe-links";
import { normalizeEventInstant, resolvedEventTimeZone } from "./event-time";
import { plainText } from "./text";

/** Values that end up in class names or CSS; anything outside these lists falls back to the default. */
export const BG_STYLES = ["soft", "solid", "dots", "bloom", "sunset", "waves", "paper", "stripes", "spotlight", "aurora", "night", "fluid-mesh", "image", "accent"] as const;
export const CARD_SHAPES = ["rounded-3d", "rounded-pill", "square-minimal"] as const;
export const EMOJI_SHAPES = ["rounded", "circle", "square", "pill"] as const;
export const BUTTON_STYLES = ["gradient", "solid", "outline", "soft"] as const;
export const DECORATION_SETS = ["template"] as const;
export const FONT_FAMILIES = ["Rubik", "Heebo"] as const;

function oneOf<T extends string>(candidate: unknown, allowed: readonly T[], fallback: T): T {
  return typeof candidate === "string" && (allowed as readonly string[]).includes(candidate) ? candidate as T : fallback;
}

export type TemplateQuestion = {
  id: string;
  widget?: "choice" | "guest-count" | "dj-song";
  prompt: string;
  helper: string;
  options: string[];
  correctOption: string;
};

export type TemplateTheme = "romance" | "party" | "elegant" | "playful" | "letter" | "mischief" | "gift" | "memories" | "wedding" | "brit" | "mitzvah" | "henna";

export type MemorySlide = { icon: string; title: string; text: string; photoKey?: string };

export const DEFAULT_MEMORY_SLIDES: MemorySlide[] = [
  { icon: "🌄", title: "הטיול ההוא", text: "יצאנו לכיוון אחד, הווייז ויתר, ובסוף מצאנו ים." },
  { icon: "🥂", title: "השולחן של שישי", text: "אותם כיסאות, אותם ויכוחים, ומישהו תמיד מאחר." },
  { icon: "📷", title: "תמונה אחת במגירה", text: "לא מתוכננת. כולם צוחקים, מישהו עוצם עיניים." },
];

export const ELEMENT_STYLE_KEYS = [
  "introLabel",
  "emoji",
  "greeting",
  "headline",
  "subtitle",
  "highlights",
  "primaryButton",
  "decorations",
  "countdown",
  "venue",
  "calendar",
  "memories",
  "waxEnvelope",
  "question",
  "options",
  "guestCounter",
  "djSong",
  "resultLabel",
  "resultTitle",
  "resultText",
  "voucher",
  "candle",
  "scratch",
  "answerRecap",
  "shareButtons",
  "musicPlayer",
] as const;

export type ElementStyleKey = typeof ELEMENT_STYLE_KEYS[number];

export type TemplateElementStyle = {
  background: string;
  color: string;
  accent: string;
  radius: number;
  size: number;
  align: "right" | "center" | "left";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export type TemplateFeatureKey =
  | "showScratchCard"
  | "showCandle"
  | "showCountdown"
  | "showVenueCard"
  | "showGuests"
  | "showDjSong"
  | "showCalendar"
  | "showAppleCalendar"
  | "showWaze"
  | "showGoogleMaps"
  | "showVoucher"
  | "showMemoriesSlider"
  | "showWaxEnvelope"
  | "showWhatsApp"
  | "showTelegram"
  | "showCopy"
  | "showAnswerRecap"
  | "showHighlights"
  | "showEmoji"
  | "showFallingEmojis"
  | "showMusicPlayer"
  | "customBlocks";

export type TemplateFeature = {
  key: TemplateFeatureKey;
  label: string;
  description: string;
  icon: string;
};

export const CUSTOM_BLOCKS = [
  { id: "emoji", label: "סמל ואימוג׳י", description: "הסמל הראשי שמוביל את העמוד", icon: "😊" },
  { id: "highlights", label: "פרטים חשובים", description: "שורות קצרות של תאריך, מקום או מידע", icon: "•" },
  { id: "questions", label: "שאלות ואינטראקציה", description: "שלב בחירה שהמבקר עובר לפני הסיום", icon: "☷" },
  { id: "location", label: "מקום וניווט", description: "תאריך, מקום, הוספה ליומן, ווייז ומפות", icon: "📍" },
  { id: "share", label: "כפתורי שיתוף", description: "וואטסאפ, טלגרם והעתקת מענה", icon: "📲" },
  { id: "answers", label: "סיכום תשובות", description: "הצגת הבחירות של המבקר בסיום", icon: "✓" },
  { id: "decorations", label: "אווירה וקישוטים", description: "אימוג׳ים שנעים ברקע ההזמנה", icon: "✨" },
] as const;

export const TEMPLATE_FEATURES: Record<string, TemplateFeature[]> = {
  date: [
    { key: "showScratchCard", label: "כרטיס גירוד להפתעה", description: "חשיפת ההפתעה האישית במסך הסיום", icon: "🪄" },
    { key: "showHighlights", label: "פרטי הערב", description: "עד חמש שורות קצרות מתחת לטקסט", icon: "•" },
    { key: "showWhatsApp", label: "כפתור וואטסאפ", description: "קבלת תשובה ישירה אחרי ההפתעה", icon: "🟢" },
    { key: "showTelegram", label: "כפתור טלגרם", description: "שיתוף מהיר של המענה", icon: "✈️" },
    { key: "showCopy", label: "העתקת מענה", description: "העתקת התשובות ללוח", icon: "📋" },
    { key: "showEmoji", label: "סמל רומנטי", description: "הסמל הגדול בראש הכרטיס", icon: "💘" },
    { key: "showFallingEmojis", label: "אימוג׳ים ברקע", description: "לבבות קטנים שנעים מאחורי ההזמנה", icon: "💕" },
  ],
  birthday: [
    { key: "showCandle", label: "כיבוי הנר", description: "לוחצים על הנר ופותחים את הברכה", icon: "🕯️" },
    { key: "showAnswerRecap", label: "סיכום התחנות", description: "מציג את הבחירות במסך הברכה", icon: "✓" },
    { key: "showWhatsApp", label: "כפתור וואטסאפ", description: "שליחת תודה אחרי הברכה", icon: "🟢" },
    { key: "showTelegram", label: "כפתור טלגרם", description: "שיתוף מהיר של הברכה", icon: "✈️" },
    { key: "showCopy", label: "העתקת מענה", description: "העתקת התשובות ללוח", icon: "📋" },
    { key: "showEmoji", label: "סמל יום הולדת", description: "הסמל הגדול בראש הכרטיס", icon: "🎂" },
    { key: "showFallingEmojis", label: "קונפטי ברקע", description: "בלון וקונפטי שנעים מאחורי ההזמנה", icon: "🎉" },
  ],
  event: [
    { key: "showCountdown", label: "ספירה לאחור", description: "טיימר עד האירוע", icon: "⏱️" },
    { key: "showVenueCard", label: "כרטיס אירוע", description: "תאריך, מקום ופרטי הגעה", icon: "🎟️" },
    { key: "showGuests", label: "מונה אורחים", description: "בחירת כמות האורחים באישור ההגעה", icon: "👥" },
    { key: "showDjSong", label: "בקשת שיר", description: "שיר אחד שהאורחים רוצים לשמוע", icon: "🎵" },
    { key: "showCalendar", label: "הוספה ליומן", description: "האירוע נכנס ליומן במכשיר", icon: "📅" },
    { key: "showAppleCalendar", label: "הורדה ליומן", description: "קובץ לאייפון ולמק", icon: "" },
    { key: "showWaze", label: "ניווט בווייז", description: "פתיחת נסיעה ישירות למקום", icon: "🧭" },
    { key: "showGoogleMaps", label: "ניווט במפות", description: "פתיחת המיקום במפות", icon: "📍" },
    { key: "showFallingEmojis", label: "אימוג׳ים ברקע", description: "קונפטי קטן שנע מאחורי ההזמנה", icon: "✨" },
    { key: "showWhatsApp", label: "שליחה ב-וואטסאפ", description: "שליחת אישור ההגעה", icon: "🟢" },
    { key: "showTelegram", label: "כפתור טלגרם", description: "שיתוף אישור ההגעה", icon: "✈️" },
    { key: "showCopy", label: "העתקת מענה", description: "העתקת פרטי האישור", icon: "📋" },
  ],
  gift: [
    { key: "showVoucher", label: "שובר מתנה נפתח", description: "קופסה אינטראקטיבית עם קוד מימוש", icon: "🎁" },
    { key: "showWhatsApp", label: "מימוש ב-וואטסאפ", description: "שליחת בקשה למימוש השובר", icon: "🟢" },
    { key: "showTelegram", label: "כפתור טלגרם", description: "שיתוף פרטי השובר", icon: "✈️" },
    { key: "showCopy", label: "העתקת מענה", description: "העתקת קוד המימוש", icon: "📋" },
    { key: "showAnswerRecap", label: "סיכום אישי", description: "מציג את התחנות שעברו בדרך לשובר", icon: "✓" },
    { key: "showEmoji", label: "סמל מתנה", description: "הסמל הגדול בראש הכרטיס", icon: "🎁" },
    { key: "showFallingEmojis", label: "אימוג׳ים ברקע", description: "קונפטי קטן שנע מאחורי השובר", icon: "✨" },
  ],
  memories: [
    { key: "showMemoriesSlider", label: "מצגת זיכרונות", description: "מעבר בין רגעים מיוחדים", icon: "📸" },
    { key: "showAnswerRecap", label: "ציר התשובות", description: "סיכום התחנות במסך הסיום", icon: "✓" },
    { key: "showWhatsApp", label: "שליחת תודה", description: "שיתוף המצגת ב-וואטסאפ", icon: "🟢" },
    { key: "showTelegram", label: "כפתור טלגרם", description: "שיתוף המצגת", icon: "✈️" },
    { key: "showCopy", label: "העתקת מענה", description: "העתקת סיכום המצגת", icon: "📋" },
    { key: "showFallingEmojis", label: "אימוג׳ים ברקע", description: "רגעים קטנים שנעים מאחורי המצגת", icon: "💫" },
  ],
  "love-note": [
    { key: "showWaxEnvelope", label: "מעטפת שעווה", description: "פתיחה חגיגית של המכתב", icon: "💌" },
    { key: "showAnswerRecap", label: "תחנות המכתב", description: "סיכום הרגעים במסך הסיום", icon: "✓" },
    { key: "showWhatsApp", label: "שליחת נשיקה", description: "שליחת תגובה ב-וואטסאפ", icon: "🟢" },
    { key: "showTelegram", label: "כפתור טלגרם", description: "שיתוף המכתב", icon: "✈️" },
    { key: "showCopy", label: "העתקת מענה", description: "העתקת סיכום המכתב", icon: "📋" },
    { key: "showEmoji", label: "סמל המכתב", description: "הסמל הגדול בראש הכרטיס", icon: "💌" },
    { key: "showFallingEmojis", label: "אימוג׳ים ברקע", description: "לבבות קטנים שנעים מאחורי המכתב", icon: "💕" },
  ],
  "custom-blank": [
    { key: "customBlocks", label: "בניית רכיבי העמוד", description: "בחירת הבלוקים שמהם העמוד יורכב", icon: "🧩" },
  ],
};

const MUSIC_PLAYER_FEATURE: TemplateFeature = {
  key: "showMusicPlayer",
  label: "נגן מוזיקה",
  description: "נגן על העמוד מקישור יוטיוב",
  icon: "♫",
};

export function normalizeTemplateId(id: string) {
  return id === "rsvp" ? "event" : id;
}

export function getTemplateFeatures(templateId: string): TemplateFeature[] {
  const features = TEMPLATE_FEATURES[normalizeTemplateId(templateId)] || [];
  if (features.some((feature) => feature.key === "showMusicPlayer")) return features;
  const insertAt = features.findIndex((feature) => feature.key === "customBlocks");
  if (insertAt < 0) return [...features, MUSIC_PLAYER_FEATURE];
  return [...features.slice(0, insertAt), MUSIC_PLAYER_FEATURE, ...features.slice(insertAt)];
}

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

  // Interactive Customization Fields
  showCountdown?: boolean;
  eventDate?: string;
  eventStartsAt?: string;
  eventEndsAt?: string;
  eventTimezone?: string;
  wazeUrl?: string;
  googleMapsUrl?: string;
  venueName?: string;
  showGuests?: boolean;
  maxGuests?: number;
  showDjSong?: boolean;
  showCalendar?: boolean;
  showAppleCalendar?: boolean;
  showWaze?: boolean;
  showGoogleMaps?: boolean;
  showWhatsApp?: boolean;
  showTelegram?: boolean;
  showCopy?: boolean;
  showVenueCard?: boolean;
  showAnswerRecap?: boolean;
  showHighlights?: boolean;
  showIntroLabel?: boolean;
  showGreeting?: boolean;
  showStartHint?: boolean;
  showFallingEmojis?: boolean;
  showEmoji?: boolean;
  voucherTitle?: string;
  voucherCode?: string;
  voucherTerms?: string;
  scratchCover?: string;
  scratchSecret?: string;
  showCandle?: boolean;
  showWaxEnvelope?: boolean;
  showScratchCard?: boolean;
  showVoucher?: boolean;
  showMemoriesSlider?: boolean;
  memorySlides?: MemorySlide[];
  rsvpEnabled?: boolean;
  rsvpNotifyOwner?: boolean;
  responseLimit?: number;
  retentionDays?: number;
  showMusicPlayer?: boolean;
  musicYoutubeUrl?: string;
  customBlocks?: string[];

  // Advanced Styling & Custom Domain Fields (Plus & Max)
  fontFamily?: string;
  cardShape?: string;
  glassBlur?: number;
  bgStyle?: string;
  bgImageVersion?: number;
  cardBackground?: string;
  cardBorderColor?: string;
  cardRadius?: number;
  emojiBackground?: string;
  emojiShape?: string;
  emojiSize?: number;
  emojiImageVersion?: number;
  decorationOpacity?: number;
  decorationFrom?: string;
  decorationTo?: string;
  decorationCount?: number;
  decorationSpeed?: number;
  buttonStyle?: string;
  decorationSet?: string;
  customSubdomain?: string;
  customDomain?: string;
  hideBranding?: boolean;
  elementStyles?: Partial<Record<ElementStyleKey, TemplateElementStyle>>;
  elementOrder?: ElementStyleKey[];
  elementLayout?: Partial<Record<ElementStyleKey, { x: number; y: number; w?: number; h?: number; rotate?: number }>>;

  // Kept in the normalized record for compatibility with pages created before multi-step templates.
  options: string[];
  correctOption: string;
};

export const DEFAULT_SCRATCH_COVER = "✨ גרדו כאן לחשיפת ההפתעה ✨";
export const SCRATCH_COVER_PLACEHOLDER = "טקסט על שכבת הגירוד";
export const SCRATCH_SECRET_PLACEHOLDER = "הטקסט שנחשף אחרי הגירוד";

export function scratchCoverText(config: Pick<TemplateConfig, "scratchCover">) {
  return (config.scratchCover || "").trim();
}

export function scratchSecretText(config: Pick<TemplateConfig, "scratchSecret">) {
  return (config.scratchSecret || "").trim();
}

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
  return { bgStyle: "paper", buttonStyle: "solid", cardShape: "square-minimal", cardRadius: 12, cardBackground: "#fffdf7", cardBorderColor: "#c5ad78", showFallingEmojis: true, showGreeting: Boolean(value.recipient), ...value, options: value.questions[0].options, correctOption: value.questions[0].correctOption };
}

export const templates: LinkliTemplate[] = [
  {
    id: "date", name: "הזמנה לדייט", category: "רומנטי", emoji: "💘", free: true,
    description: "הזמנה לערב לשניים. עונים על שלוש שאלות, ואז מגלים את התוכנית.",
    config: config({
      recipient: "שירה", headline: "יש לי הצעה שקשה לסרב לה", subtitle: "בלי לכתוב בקבוצה. בלי ״נדבר״. כמה שאלות קצרות, ואז רואים מה תכננתי.",
      introLabel: "רק לנו", startText: "פותחים", highlights: ["שולחן לשניים", "הטלפון נשאר בתיק"],
      questions: [
        { id: "question-1", widget: "choice", prompt: "איזו אווירה מתאימה לערב?", helper: "כדי שאתאים את המקום.", options: ["שיחה ארוכה במקום שקט", "מקום חדש שלא היינו בו", "משהו ספונטני", "בית, רק אנחנו"], correctOption: "" },
        { id: "question-2", widget: "choice", prompt: "מתי הכי נוח?", helper: "כדי שאוכל לסגור מקום.", options: ["חמישי בערב", "שישי בצהריים", "מוצאי שבת", "תשמור לי הפתעה"], correctOption: "" },
        { id: "question-3", widget: "choice", prompt: "מה אסור שיהיה בערב?", helper: "גבול אחד מספיק.", options: ["טלפונים על השולחן", "מקום רועש", "תוכנית סודית מדי", "אין לי תנאים"], correctOption: "" },
      ],
      finalButtonText: "לגלות לאן", resultLabel: "הערב מחכה מתחת לכרטיס",
      successTitle: "שולחן לשניים, בלי התראות", successText: "נשאיר את הטלפון בתיק וניקח את הזמן. מתחת לכרטיס מחכה הרמז, ואת היום סוגרים יחד.",
      scratchCover: "גרדו כאן", scratchSecret: "פיקניק בשקיעה. אני מביא את הקפה, לך לבחור יום.",
      whatsapp: "", whatsappText: "ראיתי. בוא נקבע ערב.", buttonText: "קובעים בוואטסאפ",
      accent: "#9b3e4e", accentSoft: "#f6ede7", emoji: "💘", decorations: ["💗", "✨", "💕", "🌸"], theme: "romance", bgStyle: "bloom", cardShape: "rounded-3d", cardRadius: 28,
    }),
  },
  {
    id: "birthday", name: "הפתעת יום הולדת", category: "חגיגה", emoji: "🎂", free: true,
    description: "הפתעה לחבר או משפחה. כמה רגעים, נר, וברכה שנפתחת אצל החוגג.",
    config: config({
      recipient: "דניאל", headline: "היום כולו שלך", subtitle: "הכנו לך כמה רגעים קצרים ואז ברכה. בלי נאומים באמצע המסעדה.",
      introLabel: "יום הולדת", startText: "פותחים את ההפתעה", highlights: ["החברים כבר בפנים", "הברכה מחכה אחרי הנר"],
      questions: [
        { id: "question-4", widget: "choice", prompt: "איזה רגע שלנו עדיין מצחיק אותך?", helper: "זה שעד היום מעלה חיוך.", options: ["הטיול שבו הווייז ויתר", "הבדיחה שאף אחד מבחוץ לא מבין", "הערב שהתחיל ב״רק קפה״", "כל רגע יחד"], correctOption: "" },
        { id: "question-5", widget: "choice", prompt: "מה החברים תמיד אומרים עליך?", helper: "בלי להתבייש.", options: ["אתה תמיד מאחר", "אתה מציל כל שולחן", "אתה עושה בלגן טוב", "אי אפשר לסכם אותך"], correctOption: "" },
        { id: "question-wish", widget: "choice", prompt: "מה תרצה שהשנה הזאת תביא?", helper: "אפשר גם לשמור בסוד.", options: ["שקט קטן", "טיול", "שהחברים יישארו קרובים", "משאלה שתישאר אצלך"], correctOption: "" },
      ],
      finalButtonText: "לברכה", resultLabel: "יום הולדת שמח",
      successTitle: "טוב שיש אותך", successText: "עוד שנה של הודעות קוליות ארוכות מדי, שולחן שתמיד יש בו מקום, וצחוק שאי אפשר לעצור. המשאלה נשארת אצלך.",
      whatsapp: "", whatsappText: "פתחתי. תודה, התרגשתי.", buttonText: "כתיבה בוואטסאפ",
      accent: "#965034", accentSoft: "#f6eee0", emoji: "🎂", decorations: ["🎉", "🎈", "✨", "🥳", "🎊"], theme: "party", bgStyle: "sunset", cardShape: "rounded-pill", cardRadius: 36,
    }),
  },
  {
    id: "event", name: "הזמנה לאירוע", category: "אירועים", emoji: "🥂", free: true,
    description: "שולחן ארוך, משהו על האש, ואישור הגעה במקום הודעה בקבוצה.",
    config: config({
      recipient: "החברים שלנו", headline: "שישי בחצר, עם כל האנשים שלנו", subtitle: "סוף סוף סוגרים את המפגש שהבטחנו בקבוצה. יש שולחן ארוך ומקום בדיוק בשבילכם.",
      introLabel: "מפגש בחצר", startText: "לאישור הגעה", highlights: ["שישי · 13:00", "החצר של משפחת לוי"],
      questions: [
        { id: "question-7", widget: "choice", prompt: "מגיעים?", helper: "גם אם עוד לא סגור, עדיף שנדע עכשיו.", options: ["מגיעים", "עדיין לא בטוחים", "לא נוכל הפעם"], correctOption: "" },
        { id: "question-8", widget: "guest-count", prompt: "כמה מקומות לשמור?", helper: "כולל אתכם. כדי שנדע כמה צלחות.", options: ["רק אני", "שניים", "שלושה", "ארבעה ומעלה"], correctOption: "" },
        { id: "question-9", widget: "dj-song", prompt: "איזה שיר חייב בשישי?", helper: "גם השיר שמתביישים לאהוב.", options: ["משהו מקפיץ", "שקט וים־תיכוני", "מה שכולם שרים", "נשאיר לכם"], correctOption: "" },
        { id: "question-event-bring", widget: "choice", prompt: "מביאים משהו?", helper: "לא חובה. נשמח גם בלי.", options: ["שתיה", "סלט", "רק את עצמנו", "הפתעה קטנה"], correctOption: "" },
      ],
      finalButtonText: "סיום המענה", resultLabel: "נתראה בשישי",
      successTitle: "השולחן כבר כמעט ערוך", successText: "תודה שעניתם. את שאר הסיפורים נשמור לחצר. אפשר לשלוח את המענה למארחים.",
      eventDate: "18.09.2026 · 13:00", eventStartsAt: "2026-09-18T13:00:00", eventEndsAt: "2026-09-18T16:00:00", eventTimezone: "Asia/Jerusalem", venueName: "בחצר של משפחת לוי",
      whatsapp: "", whatsappText: "אישרנו הגעה. נתראה בחצר.", buttonText: "שליחת האישור",
      accent: "#0f766e", accentSoft: "#edf9f6", emoji: "🥂", decorations: ["✨", "🥂", "🌿", "💫"], theme: "elegant", bgStyle: "paper",
      rsvpEnabled: true, rsvpNotifyOwner: false, responseLimit: 500, retentionDays: 365, showAnswerRecap: false,
    }),
  },
  {
    id: "gift", name: "מתנה עם סיפור", category: "מתנות", emoji: "🎁", free: false,
    description: "שובר חוויה שנפתח אצל המקבל. בסוף יש קוד ויום שסוגרים יחד.",
    config: config({
      recipient: "מיכל", headline: "מגיע לך בוקר שלם", subtitle: "לא חבילה בדלת. זמן. קפה. מישהו שסגר בשבילך את הסידורים.",
      introLabel: "מתנה", startText: "פותחים את השובר", highlights: ["בוקר בלי סידורים", "אתם בוחרים יום"],
      questions: [
        { id: "question-10", widget: "choice", prompt: "מה לדעתך בפנים?", helper: "בלי לשאול את המשפחה. הם כבר יודעים.", options: ["בוקר שלם", "ארוחה טובה", "יום שקט", "משהו שלא כתבתי כאן"], correctOption: "" },
        { id: "question-11", widget: "choice", prompt: "מתי הכי מתאים לממש?", helper: "נשמור את היום.", options: ["סוף השבוע הקרוב", "יום ההולדת", "כשיתפנה היומן", "תקבעו אתם"], correctOption: "" },
        { id: "question-12", widget: "choice", prompt: "איך נוח לממש?", helper: "כדי שנדע איך לסגור.", options: ["יחד, אתם סוגרים יום", "אני בוחר תאריך", "תפתיעו אותי"], correctOption: "" },
      ],
      finalButtonText: "לפתיחת השובר", resultLabel: "השובר אצלך",
      successTitle: "פנינו זמן רק בשבילך", successText: "בוקר בלי סידורים. קפה במקום האהוב, טיול קטן וארוחה עלינו. בוחרים יום, ואת השאר אנחנו מסדרים.",
      whatsapp: "", whatsappText: "פתחתי את השובר. רוצה לתאם יום.", buttonText: "תיאום בוואטסאפ",
      voucherTitle: "בוקר שלם עלינו", voucherCode: "זמן-בשבילך", voucherTerms: "מתנה מהמארחים. מתאמים יחד, בלי תאריך תפוגה.",
      accent: "#806028", accentSoft: "#f5efdf", emoji: "🎁", decorations: ["🎁", "✨", "🎉", "🥂"], theme: "gift", bgStyle: "accent", cardShape: "rounded-3d", cardRadius: 22,
    }),
  },
  {
    id: "memories", name: "מצגת זיכרונות", category: "זיכרונות", emoji: "📸", free: true,
    description: "אלבום קצר למשפחה. כמה תמונות ומשפטים, ואז מכתב שסוגר את הרגע.",
    config: config({
      recipient: "המשפחה", headline: "הרגעים ששמרנו", subtitle: "לא אלבום מסודר. כמה תמונות, כמה משפטים, והרעש סביב השולחן.",
      introLabel: "מתוך המגירה", startText: "לצפייה", highlights: ["הטיול שהתחיל בפקק", "ארוחת שישי שנמשכה"],
      questions: [
        { id: "question-13", widget: "choice", prompt: "איזה רגע שווה לספר שוב?", helper: "גם אם כולם כבר מכירים את הסוף.", options: ["הטיול שהתחיל בפקק ונגמר בים", "החתונה", "ארוחת שישי שנמשכה עד שבת", "כל השנים האלה"], correctOption: "" },
        { id: "question-14", widget: "choice", prompt: "מה התמונה לא תופסת?", helper: "צריך להיות שם כדי להבין.", options: ["הצחוק", "החיבוק", "הרעש סביב השולחן", "השקט אחרי שהילדים נרדמו"], correctOption: "" },
        { id: "question-14b", widget: "choice", prompt: "מי חסר סביב השולחן הפעם?", helper: "כדי שנדע למי לשלוח אחרי.", options: ["סבא או סבתא", "מישהו שגר רחוק", "הדור הצעיר", "כולנו כאן"], correctOption: "" },
      ],
      finalButtonText: "למכתב", resultLabel: "שמרנו",
      successTitle: "תודה על הרגעים שאי אפשר לקנות", successText: "השנים האלה הן מה שיש לנו. שנמשיך לשבת סביב אותו שולחן, גם כשהכיסאות מתחלפים.",
      whatsapp: "", whatsappText: "עברתי על הרגעים. תודה ששמרתם.", buttonText: "כתיבת תודה",
      accent: "#476876", accentSoft: "#edf1ee", emoji: "📸", decorations: ["📸", "✨", "💫", "🤍"], theme: "memories", bgStyle: "waves", cardShape: "rounded-3d", cardRadius: 22, cardBackground: "#f4f7f6",
      memorySlides: DEFAULT_MEMORY_SLIDES,
    }),
  },
  {
    id: "love-note", name: "מכתב אהבה", category: "רומנטי", emoji: "💌", free: false,
    description: "מכתב פרטי לבן או בת הזוג. נפתח לאט, ונשאר אצלכם.",
    config: config({
      recipient: "אהבה שלי", headline: "יש משהו שרציתי לומר לך", subtitle: "לא סטטוס. לא שיר. מכתב קצר שנפתח לאט.",
      introLabel: "מכתב", startText: "פותחים את המעטפה", highlights: ["רק אתם רואים", "אפשר לקרוא פעמיים"],
      questions: [
        { id: "question-16", widget: "choice", prompt: "מתי הבנת שזה הסיפור שלנו?", helper: "רגע אחד מספיק.", options: ["הקפה הראשון", "הטיול", "הבדיחה שרק שנינו מבינים", "ברגעים הקטנים"], correctOption: "" },
        { id: "question-17", widget: "choice", prompt: "מה מחזיק אותנו?", helper: "בלי לחשוב יותר מדי.", options: ["שומרים ביס אחרון אחד לשנייה", "צוחקים מכל דבר", "אפשר גם לשתוק ביחד", "כל אלה"], correctOption: "" },
        { id: "question-18", widget: "choice", prompt: "מה בא לך לשמוע עכשיו?", helper: "המכתב יחכה מיד אחרי.", options: ["אוהב אותך", "מתגעגע", "גאה בנו", "נשב בשקט"], correctOption: "" },
      ],
      finalButtonText: "לקריאת המכתב", resultLabel: "מהלב",
      successTitle: "איתך אני בבית", successText: "בקפה על השיש, ב«הגעת?» בסוף היום, ובבדיחה שעדיין מצחיקה רק אותנו. לא צריך סיבה מיוחדת לכתוב לך את זה היום.",
      whatsapp: "", whatsappText: "קראתי. בא לי לחבק אותך.", buttonText: "כתיבה בוואטסאפ",
      accent: "#864954", accentSoft: "#f4ece8", emoji: "💌", decorations: ["❤️", "💌", "✨", "🌹"], theme: "letter", bgStyle: "paper", cardShape: "rounded-3d", cardRadius: 20,
    }),
  },
  {
    id: "custom-blank", name: "פתק אישי", category: "בלי סיבה", emoji: "✉️", free: true,
    description: "פתק קטן בלי תאריך בלוח. משנים הכול, ושולחים כשבא לכם.",
    config: config({
      recipient: "חבר אהוב", headline: "זה הזכיר לי אותך", subtitle: "בלי יום הולדת ובלי סיבה בלוח. משהו קטן שישאר אחרי שהמסך ייסגר.",
      introLabel: "פתק", startText: "יש לי רגע", highlights: ["רק בשבילך", "בלי סיבה"],
      questions: [
        { id: "question-19", widget: "choice", prompt: "מה היה חסר לנו לאחרונה?", helper: "לא פותרים בהודעה קולית.", options: ["קפה בלי שעון", "שיחה פנים אל פנים", "סתם לשבת ביחד"], correctOption: "" },
        { id: "custom-next-time", widget: "choice", prompt: "מה עושים עם זה?", helper: "בלי להתחייב יותר מדי.", options: ["קובעים השבוע", "שולחים מתי שנוח", "משאירים פתוח"], correctOption: "" },
        { id: "custom-when", widget: "choice", prompt: "מתי ניפגש?", helper: "אפשר גם בקרוב.", options: ["השבוע", "החודש", "בקרוב"], correctOption: "" },
      ],
      finalButtonText: "לפתיחת הפתק", resultLabel: "חשבתי עליך",
      successTitle: "יש לך מקום אצלי", successText: "גם כשעובר שבוע בלי לדבר, גם כשאנחנו רק מסמנים לב. רציתי שתהיה לך תזכורת: כיף לי שיש אותך. בואו נפנה זמן.",
      whatsapp: "", whatsappText: "קיבלתי. בואו נקבע קפה.", buttonText: "כתיבה בוואטסאפ",
      customBlocks: ["emoji", "highlights", "questions", "location", "share", "answers", "decorations"],
      accent: "#53634a", accentSoft: "#f0f1e7", emoji: "✉️", decorations: ["✉️", "🌿"], theme: "playful", bgStyle: "soft", cardShape: "rounded-pill", cardRadius: 30, cardBackground: "#f3f4ec",
    }),
  },
];

const lifeCycleInvitations = [
  { id: "wedding", name: "הזמנה לחתונה", category: "חתונה", emoji: "🕊️", theme: "wedding", accent: "#875346", accentSoft: "#f5eee3", bgStyle: "paper", cardShape: "square-minimal", cardRadius: 6, cardBackground: "#fffdf8", cardBorder: "#c5ad78", buttonStyle: "outline", decorations: ["🕊️", "🌿"], headline: "נועם ויעל מתחתנים", subtitle: "מכל האנשים בעולם, הכי נשמח לראות אתכם לידנו כשהכול מתחיל.", introLabel: "עם המשפחות", venueName: "הגן שלנו", highlights: ["קבלת פנים ב־19:30", "חופה בגן", "נעליים שאפשר לרקוד בהן"], question: "תהיו איתנו בחופה?", helper: "כדי שנשמור לכם מקום ליד החופה.", song: "איזה שיר יעלה אתכם לרחבה?", extra: { prompt: "איך תגיעו?", helper: "כדי שנדע איפה לשים חניה.", options: ["ברכב", "עם מישהו", "עדיין לא סגור"] }, resultLabel: "אישור התקבל", result: "שמרנו לכם מקום", text: "תודה שאתם חלק מהסיפור. נתראה בחופה, ומשם לרחבה.", guests: "כמה מקומות לשמור?", reply: "אישרנו הגעה לחתונה. נתראה בגן.", button: "שליחת האישור", dj: true },
  { id: "brit", name: "ברית / בריתה", category: "משפחה", emoji: "🌱", theme: "brit", accent: "#557268", accentSoft: "#eef3ec", bgStyle: "soft", cardShape: "rounded-pill", cardRadius: 28, cardBackground: "#f7faf6", cardBorder: "#9bb29a", buttonStyle: "soft", decorations: ["🌱", "🤍"], headline: "אדם קטן, אהבה גדולה", subtitle: "המשפחה גדלה. נשמח להכיר לכם את מי שכבר שינה לנו את הבית.", introLabel: "התוספת למשפחה", venueName: "בבית", highlights: ["מפגש קטן", "משהו מתוק על השולחן"], question: "תבואו להכיר?", helper: "מפגש קטן. גם אם אתם רחוקים, נשמח לדעת.", song: "", extra: { prompt: "מגיעים גם לארוחה אחרי?", helper: "כדי שנדע כמה מקומות ליד השולחן.", options: ["כן", "רק לברכה", "נעדכן"] }, resultLabel: "מחכים לכם בבית", result: "כמה טוב שתהיו", text: "מחכים לחגוג את ההתחלה הזאת. אם צריך כתובת או שעה, כתבו לנו.", guests: "כמה מגיעים?", reply: "אישרנו הגעה. מחכים לחבק.", button: "שליחת האישור", dj: false },
  { id: "mitzvah", name: "בר / בת מצווה", category: "משפחה", emoji: "✡️", theme: "mitzvah", accent: "#325c80", accentSoft: "#edf2f8", bgStyle: "stripes", cardShape: "rounded-3d", cardRadius: 20, cardBackground: "#f3f6fb", cardBorder: "#8aa0b8", buttonStyle: "solid", decorations: ["✡️", "⭐"], headline: "תמר עולה לבמה", subtitle: "רגע של גאווה. חוגגים בת מצווה, והאנשים האהובים מוזמנים.", introLabel: "בת מצווה", venueName: "האולם", highlights: ["משפחה וחברים", "יש רחבה"], question: "מצטרפים?", helper: "כדי שנשמור לכם מקום באולם.", song: "איזה שיר חייב במסיבה?", extra: { prompt: "מאיפה אתם מכירים את תמר?", helper: "רק כדי שנדע איפה להושיב.", options: ["משפחה", "בית ספר", "שכנים", "חברים של ההורים"] }, resultLabel: "נתראה באולם", result: "החגיגה מתחילה איתכם", text: "כיף שתהיו בערב הזה. נתראה עם מצב רוח.", guests: "כמה מגיעים?", reply: "אישרנו הגעה לבת המצווה.", button: "שליחת האישור", dj: true },
  { id: "henna", name: "חינה / אירוסין", category: "מסורת", emoji: "🪬", theme: "henna", accent: "#a34c28", accentSoft: "#fbf0df", bgStyle: "accent", cardShape: "rounded-3d", cardRadius: 16, cardBackground: "#fbf4e8", cardBorder: "#d4a36a", buttonStyle: "gradient", decorations: ["🪬", "✦", "🌺"], headline: "ערב של חינה", subtitle: "לפני החופה נפגשים. צבע, שולחן, וברכות עד מאוחר.", introLabel: "לפני החופה", venueName: "בית המשפחה", highlights: ["לבוש צבעוני", "מתוקים עד מאוחר"], question: "תבואו לשמוח איתנו?", helper: "כדי שנכין מגשים ומקום לכולם.", song: "מה ינגן בכניסה?", extra: { prompt: "עד מתי נישאר?", helper: "כדי שנדע איך לבנות את הערב.", options: ["לטקס", "גם לרקוד", "כל הערב"] }, resultLabel: "שיהיה במזל", result: "שיהיה במזל", text: "הברכות שלכם הן המתנה. מחכים לחגוג עם כל המשפחה.", guests: "לכמה להכין מגש?", reply: "אישרנו הגעה לחינה. נתראה בבית.", button: "שליחת האישור", dj: true },
] as const;

for (const invitation of lifeCycleInvitations) {
  const seed = templates.find((template) => template.id === "event")!.config;
  TEMPLATE_FEATURES[invitation.id] = TEMPLATE_FEATURES.event.filter((feature) => invitation.dj || feature.key !== "showDjSong").map((feature) => ({ ...feature }));
  templates.push({
    id: invitation.id, name: invitation.name, category: invitation.category, emoji: invitation.emoji, free: true,
    description: invitation.subtitle,
    config: config({
      ...seed, recipient: "", headline: invitation.headline, subtitle: invitation.subtitle, introLabel: invitation.introLabel,
      startText: "לאישור הגעה", finalButtonText: "להשלמת האישור", resultLabel: invitation.resultLabel, successTitle: invitation.result, successText: invitation.text,
      theme: invitation.theme, emoji: invitation.emoji, accent: invitation.accent, accentSoft: invitation.accentSoft, bgStyle: invitation.bgStyle,
      decorations: [...invitation.decorations], highlights: [...invitation.highlights], venueName: invitation.venueName,
      eventStartsAt: "", eventEndsAt: "", eventDate: "", wazeUrl: "", googleMapsUrl: "", eventTimezone: "Asia/Jerusalem",
      rsvpEnabled: true, rsvpNotifyOwner: true, showGuests: true, showDjSong: invitation.dj, showAnswerRecap: false,
      showVenueCard: true, showWaze: true, showCalendar: true, showAppleCalendar: true, showCountdown: true,
      showFallingEmojis: true, showGreeting: false, showCandle: false, showScratchCard: false, buttonStyle: invitation.buttonStyle, cardShape: invitation.cardShape, cardRadius: invitation.cardRadius, cardBackground: invitation.cardBackground, cardBorderColor: invitation.cardBorder,
      whatsappText: invitation.reply, buttonText: invitation.button,
      questions: [
        { id: `${invitation.id}-attendance`, widget: "choice", prompt: invitation.question, helper: invitation.helper, options: ["מגיעים", "עדיין לא בטוחים", "לא נוכל הפעם"], correctOption: "" },
        { id: `${invitation.id}-guests`, widget: "guest-count", prompt: invitation.guests, helper: "כולל אתכם. אפשר לעדכן אחר כך.", options: ["רק אני", "שניים", "כל המשפחה"], correctOption: "" },
        { id: `${invitation.id}-extra`, widget: "choice", prompt: invitation.extra.prompt, helper: invitation.extra.helper, options: [...invitation.extra.options], correctOption: "" },
        ...(invitation.dj ? [{ id: `${invitation.id}-song`, widget: "dj-song" as const, prompt: invitation.song, helper: "בקשה אחת. אפשר גם לדלג.", options: ["תפתיעו אותנו", "יש לנו בקשה"], correctOption: "" }] : []),
      ],
    }),
  });
}

export function getTemplate(id: string) {
  const normalized = normalizeTemplateId(id);
  return templates.find((template) => template.id === normalized) ?? templates[0];
}

export function safeConfig(value: unknown, templateId: string): TemplateConfig {
  const base = getTemplate(templateId).config;
  const input = (value && typeof value === "object" ? value : base) as Partial<TemplateConfig>;
  const limitedString = (candidate: unknown, fallback: string, max: number) => {
    const normalized = plainText(candidate, max);
    return normalized || fallback;
  };
  const copyString = (candidate: unknown, fallback: string, max: number) => {
    if (typeof candidate !== "string") return fallback;
    return plainText(candidate, max);
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
  const seenIds = new Set<string>();
  const legacyWidgets = sourceQuestions.length > 0 && !sourceQuestions.some((q) => q && typeof q === "object" && "widget" in q);
  const legacyEvent = templateId === "event" || templateId === "custom-blank" || base.theme === "elegant";
  const questions = Array.from({ length: questionCount }, (_, index) => {
    const fallback = base.questions[index] || base.questions[base.questions.length - 1];
    const source = sourceQuestions[index] && typeof sourceQuestions[index] === "object"
      ? sourceQuestions[index] as Partial<TemplateQuestion>
      : index === 0 ? { id: "question-20", widget: "choice", prompt: input.headline, helper: input.subtitle, options: legacyOptions, correctOption: legacyCorrect } : {};
    const options = safeOptions(source.options, fallback.options);
    const requestedCorrect = limitedString(source.correctOption, fallback.correctOption, 120);
    let id = typeof source.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(source.id) ? source.id : `q-${index + 1}`;
    while (seenIds.has(id)) id = `${id.slice(0, 64)}-${index + 1}`;
    seenIds.add(id);
    let widget = oneOf(source.widget, ["choice", "guest-count", "dj-song"] as const, sourceQuestions.length ? "choice" : fallback.widget || "choice");
    if (legacyWidgets && legacyEvent) {
      if ((input.showGuests ?? base.showGuests ?? base.theme === "elegant") && index === Math.min(1, questionCount - 1)) widget = "guest-count";
      else if ((input.showDjSong ?? base.showDjSong ?? base.theme === "elegant") && index === Math.min(2, questionCount - 1)) widget = "dj-song";
    }
    return {
      id, widget,
      prompt: copyString(source.prompt, fallback.prompt, 140),
      helper: copyString(source.helper, fallback.helper, 240),
      options,
      correctOption: requestedCorrect && options.includes(requestedCorrect) ? requestedCorrect : fallback.correctOption && options.includes(fallback.correctOption) ? fallback.correctOption : "",
    };
  });
  const color = (key: "accent" | "accentSoft") => {
    const candidate = typeof input[key] === "string" ? input[key]!.trim() : "";
    return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : base[key];
  };
  const colorValue = (candidate: unknown, fallback: string) => {
    const normalized = typeof candidate === "string" ? candidate.trim() : "";
    return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : fallback;
  };
  const decorations = Array.isArray(input.decorations)
    ? input.decorations.map((item) => plainText(item, 16, true)).filter(Boolean).slice(0, 8)
    : base.decorations;
  const customBlocks = Array.isArray(input.customBlocks)
    ? input.customBlocks.map((item) => plainText(item, 32, true)).filter((item) => ["emoji", "highlights", "questions", "location", "share", "answers", "decorations"].includes(item)).slice(0, 7)
    : base.customBlocks || ["emoji", "highlights", "questions", "location", "share", "answers", "decorations"];
  const elementStyles = Object.fromEntries(ELEMENT_STYLE_KEYS.flatMap((key) => {
    const raw = input.elementStyles && typeof input.elementStyles === "object"
      ? (input.elementStyles as Record<string, unknown>)[key]
      : undefined;
    if (!raw || typeof raw !== "object") return [];
    const style = raw as Record<string, unknown>;
    const align = style.align === "right" || style.align === "left" || style.align === "center" ? style.align : "center";
    return [[key, {
      background: colorValue(style.background, "#ffffff"),
      color: colorValue(style.color, "#21182c"),
      accent: colorValue(style.accent, base.accent),
      radius: typeof style.radius === "number" ? Math.min(40, Math.max(0, style.radius)) : 16,
      size: typeof style.size === "number" ? Math.min(220, Math.max(70, style.size)) : 100,
      align,
      bold: style.bold === true,
      italic: style.italic === true,
      underline: style.underline === true,
    }]];
  })) as Partial<Record<ElementStyleKey, TemplateElementStyle>>;
  const eventTimezone = resolvedEventTimeZone(input.eventTimezone || base.eventTimezone);
  const eventInstant = normalizeEventInstant({
    eventStartsAt: copyString(input.eventStartsAt, base.eventStartsAt || "", 40),
    eventEndsAt: copyString(input.eventEndsAt, base.eventEndsAt || "", 40),
    eventTimezone,
    eventDate: copyString(input.eventDate, base.eventDate || "", 60),
  });
  return {
    recipient: copyString(input.recipient, base.recipient, 80),
    headline: copyString(input.headline, base.headline, 120),
    subtitle: copyString(input.subtitle, base.subtitle, 320).replace("עיצוב מאפס עם", "עיצוב חופשי עם"),
    introLabel: copyString(input.introLabel, base.introLabel, 80).replace("יצירה בהתאמה אישית", "עיצוב בהתאמה אישית"),
    startText: copyString(input.startText, base.startText, 80),
    highlights: (Array.isArray(input.highlights)
      ? input.highlights.map((item) => plainText(item, 80, true)).filter(Boolean).slice(0, 5)
      : base.highlights).map((item) => item === "עיצוב מאפס" ? "עיצוב חופשי" : item),
    questions,
    finalButtonText: copyString(input.finalButtonText, base.finalButtonText, 80),
    resultLabel: copyString(input.resultLabel, base.resultLabel, 80),
    successTitle: copyString(input.successTitle, base.successTitle, 140),
    successText: copyString(input.successText, base.successText, 700),
    whatsapp: copyString(input.whatsapp, base.whatsapp, 18).replace(/\D/g, "").slice(0, 15),
    whatsappText: copyString(input.whatsappText, base.whatsappText, 500),
    buttonText: copyString(input.buttonText, base.buttonText, 80),
    accent: color("accent"), accentSoft: color("accentSoft"),
    emoji: limitedString(input.emoji, base.emoji, 16), decorations: decorations.length ? decorations : base.decorations, theme: base.theme,

    // Interactive Customization Controls
    showCountdown: typeof input.showCountdown === "boolean" ? input.showCountdown : base.showCountdown ?? base.theme === "elegant",
    eventTimezone,
    eventStartsAt: eventInstant?.startLocal || "",
    eventEndsAt: eventInstant?.endLocal || "",
    eventDate: eventInstant?.display || copyString(input.eventDate, base.eventDate || "", 60),
    wazeUrl: safeNavigationUrl(input.wazeUrl ?? base.wazeUrl, "waze"),
    googleMapsUrl: safeNavigationUrl(input.googleMapsUrl ?? base.googleMapsUrl, "maps"),
    venueName: copyString(input.venueName, base.venueName || "", 80),
    showGuests: typeof input.showGuests === "boolean" ? input.showGuests : base.showGuests ?? base.theme === "elegant",
    maxGuests: typeof input.maxGuests === "number" ? Math.min(20, Math.max(1, input.maxGuests)) : 10,
    showDjSong: typeof input.showDjSong === "boolean" ? input.showDjSong : base.showDjSong ?? base.theme === "elegant",
    showCalendar: typeof input.showCalendar === "boolean" ? input.showCalendar : base.showCalendar ?? base.theme === "elegant",
    showAppleCalendar: typeof input.showAppleCalendar === "boolean" ? input.showAppleCalendar : base.showAppleCalendar ?? false,
    showWaze: typeof input.showWaze === "boolean" ? input.showWaze : base.showWaze ?? base.theme === "elegant",
    showGoogleMaps: typeof input.showGoogleMaps === "boolean" ? input.showGoogleMaps : base.showGoogleMaps ?? false,
    showWhatsApp: typeof input.showWhatsApp === "boolean" ? input.showWhatsApp : base.showWhatsApp ?? true,
    showTelegram: typeof input.showTelegram === "boolean" ? input.showTelegram : base.showTelegram ?? false,
    showCopy: typeof input.showCopy === "boolean" ? input.showCopy : base.showCopy ?? false,
    showVenueCard: typeof input.showVenueCard === "boolean" ? input.showVenueCard : base.showVenueCard ?? base.theme === "elegant",
    showAnswerRecap: typeof input.showAnswerRecap === "boolean" ? input.showAnswerRecap : base.showAnswerRecap ?? true,
    showHighlights: typeof input.showHighlights === "boolean" ? input.showHighlights : base.showHighlights ?? true,
    showIntroLabel: typeof input.showIntroLabel === "boolean" ? input.showIntroLabel : base.showIntroLabel ?? true,
    showGreeting: typeof input.showGreeting === "boolean" ? input.showGreeting : base.showGreeting ?? true,
    showStartHint: typeof input.showStartHint === "boolean" ? input.showStartHint : base.showStartHint ?? true,
    showFallingEmojis: typeof input.showFallingEmojis === "boolean" ? input.showFallingEmojis : base.showFallingEmojis ?? true,
    showEmoji: typeof input.showEmoji === "boolean" ? input.showEmoji : base.showEmoji ?? true,
    voucherTitle: copyString(input.voucherTitle, base.voucherTitle || "שובר מתנה מפנק", 100),
    voucherCode: copyString(input.voucherCode, base.voucherCode || "LINKLI-GIFT-2026", 40),
    voucherTerms: copyString(input.voucherTerms, base.voucherTerms || "בתוקף לשנה מיום ההנפקה", 200),
    scratchCover: copyString(input.scratchCover, base.scratchCover || DEFAULT_SCRATCH_COVER, 80),
    scratchSecret: copyString(input.scratchSecret, base.scratchSecret || "", 140),
    showCandle: typeof input.showCandle === "boolean" ? input.showCandle : templateId === "birthday",
    showWaxEnvelope: typeof input.showWaxEnvelope === "boolean" ? input.showWaxEnvelope : templateId === "love-note",
    showScratchCard: typeof input.showScratchCard === "boolean" ? input.showScratchCard : templateId === "date",
    showVoucher: typeof input.showVoucher === "boolean" ? input.showVoucher : templateId === "gift",
    showMemoriesSlider: typeof input.showMemoriesSlider === "boolean" ? input.showMemoriesSlider : templateId === "memories",
    memorySlides: (() => {
      const fallback = Array.isArray(base.memorySlides) && base.memorySlides.length ? base.memorySlides : DEFAULT_MEMORY_SLIDES;
      const source = Array.isArray(input.memorySlides) ? input.memorySlides : fallback;
      const slides = source.slice(0, 6).map((item, index) => {
        const raw = item && typeof item === "object" ? item as Partial<MemorySlide> : {};
        const seed = fallback[index] || fallback[0];
        return {
          icon: limitedString(raw.icon, seed.icon, 8),
          title: copyString(raw.title, seed.title, 80),
          text: copyString(raw.text, seed.text, 240),
          ...(typeof raw.photoKey === "string" && /^[A-Za-z0-9/_-]{1,240}(?:\.[a-z0-9]{1,5})?$/.test(raw.photoKey) ? { photoKey: raw.photoKey } : {}),
        };
      }).filter((slide) => slide.title || slide.text);
      return slides.length ? slides : fallback;
    })(),
    rsvpEnabled: typeof input.rsvpEnabled === "boolean" ? input.rsvpEnabled : base.rsvpEnabled ?? templateId === "event",
    rsvpNotifyOwner: typeof input.rsvpNotifyOwner === "boolean" ? input.rsvpNotifyOwner : base.rsvpNotifyOwner ?? false,
    responseLimit: typeof input.responseLimit === "number" ? Math.min(5_000, Math.max(1, Math.round(input.responseLimit))) : (base.responseLimit ?? 500),
    retentionDays: typeof input.retentionDays === "number" ? Math.min(730, Math.max(30, Math.round(input.retentionDays))) : (base.retentionDays ?? 365),
    showMusicPlayer: typeof input.showMusicPlayer === "boolean" ? input.showMusicPlayer : false,
    musicYoutubeUrl: copyString(input.musicYoutubeUrl, base.musicYoutubeUrl || "", 300),
    customBlocks,

    // Advanced Styling & Custom Domain Fields (Plus & Max)
    fontFamily: oneOf(input.fontFamily, FONT_FAMILIES, "Rubik"),
    cardShape: oneOf(input.cardShape, CARD_SHAPES, oneOf(base.cardShape, CARD_SHAPES, "square-minimal")),
    glassBlur: typeof input.glassBlur === "number" ? Math.min(50, Math.max(0, input.glassBlur)) : 30,
    bgStyle: oneOf(input.bgStyle, BG_STYLES, oneOf(base.bgStyle, BG_STYLES, "soft")),
    bgImageVersion: typeof input.bgImageVersion === "number" && Number.isFinite(input.bgImageVersion) ? Math.max(0, Math.round(input.bgImageVersion)) : 0,
    cardBackground: colorValue(input.cardBackground, base.cardBackground || "#fffdf7"),
    cardBorderColor: colorValue(input.cardBorderColor, base.cardBorderColor || "#c5ad78"),
    cardRadius: typeof input.cardRadius === "number" ? Math.min(48, Math.max(0, input.cardRadius)) : (base.cardRadius ?? 12),
    emojiBackground: colorValue(input.emojiBackground, base.accentSoft),
    emojiShape: oneOf(input.emojiShape, EMOJI_SHAPES, "rounded"),
    emojiSize: typeof input.emojiSize === "number" ? Math.min(96, Math.max(28, input.emojiSize)) : 55,
    emojiImageVersion: typeof input.emojiImageVersion === "number" && Number.isFinite(input.emojiImageVersion) ? Math.max(0, Math.round(input.emojiImageVersion)) : 0,
    decorationOpacity: typeof input.decorationOpacity === "number" ? Math.min(1, Math.max(0, input.decorationOpacity)) : 0.5,
    decorationFrom: ["top", "bottom", "left", "right"].includes(String(input.decorationFrom)) ? String(input.decorationFrom) : "top",
    decorationTo: ["top", "bottom", "left", "right"].includes(String(input.decorationTo)) ? String(input.decorationTo) : "bottom",
    decorationCount: typeof input.decorationCount === "number" ? Math.min(24, Math.max(4, Math.round(input.decorationCount))) : 12,
    decorationSpeed: typeof input.decorationSpeed === "number" ? Math.min(2.2, Math.max(0.4, Math.round(input.decorationSpeed * 10) / 10)) : 1,
    buttonStyle: oneOf(input.buttonStyle, BUTTON_STYLES, oneOf(base.buttonStyle, BUTTON_STYLES, "solid")),
    decorationSet: oneOf(input.decorationSet, DECORATION_SETS, "template"),
    customSubdomain: limitedString(input.customSubdomain, "", 60).toLowerCase().replace(/[^a-z0-9-]/g, ""),
    customDomain: limitedString(input.customDomain, "", 100).toLowerCase().replace(/[^a-z0-9.-]/g, ""),
    hideBranding: typeof input.hideBranding === "boolean" ? input.hideBranding : false,
    elementStyles,
    elementOrder: (() => {
      if (!Array.isArray(input.elementOrder)) return undefined;
      const keys = input.elementOrder.filter((key): key is ElementStyleKey => ELEMENT_STYLE_KEYS.includes(key as ElementStyleKey));
      return keys.length ? keys : undefined;
    })(),
    elementLayout: (() => {
      if (!input.elementLayout || typeof input.elementLayout !== "object") return undefined;
      const source = input.elementLayout as Record<string, unknown>;
      const next: Partial<Record<ElementStyleKey, { x: number; y: number; w?: number; h?: number; rotate?: number }>> = {};
      const clampPoint = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value * 10) / 10));
      const clampRotate = (value: number) => {
        let rotate = value % 360;
        if (rotate > 180) rotate -= 360;
        if (rotate <= -180) rotate += 360;
        return Math.round(rotate * 10) / 10;
      };
      for (const key of ELEMENT_STYLE_KEYS) {
        const raw = source[key];
        if (!raw || typeof raw !== "object") continue;
        const point = raw as Record<string, unknown>;
        if (typeof point.x !== "number" || typeof point.y !== "number") continue;
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        const parsed: { x: number; y: number; w?: number; h?: number; rotate?: number } = {
          x: clampPoint(point.x, 6, 94),
          y: clampPoint(point.y, 6, 94),
        };
        if (typeof point.w === "number" && Number.isFinite(point.w)) parsed.w = clampPoint(point.w, 6, 92);
        if (typeof point.h === "number" && Number.isFinite(point.h)) parsed.h = clampPoint(point.h, 6, 92);
        if (typeof point.rotate === "number" && Number.isFinite(point.rotate)) {
          const rotate = clampRotate(point.rotate);
          if (rotate !== 0) parsed.rotate = rotate;
        }
        next[key] = parsed;
      }
      return Object.keys(next).length ? next : undefined;
    })(),

    options: questions[0].options, correctOption: questions[0].correctOption,
  };
}
