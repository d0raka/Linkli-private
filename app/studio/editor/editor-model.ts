import type { ElementStyleKey, TemplateConfig, TemplateFeature } from "@/lib/templates";
import { planLockLabel, type PlanFeatureId, type PlanType } from "@/lib/plans";
import type { ToolboxGroupId, ToolboxRow } from "../editor-toolbox";

export function toDisplayPhone(raw: string): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) {
    digits = "0" + digits.slice(3);
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function toNormalizedPhone(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) {
    return "972" + digits.slice(1);
  }
  if (digits.startsWith("972")) {
    return digits;
  }
  return "972" + digits;
}

export type EditorSection = "opening" | "questions" | "guests" | "completion" | "design";
export type PreviewScreen = "all" | "intro" | "question" | "result";

export const editorSections: { id: EditorSection; label: string; helper: string }[] = [
  { id: "opening", label: "פתיחה", helper: "למי העמוד ומה אומרים בהתחלה" },
  { id: "questions", label: "שאלות", helper: "החוויה והבחירות של המבקר" },
  { id: "guests", label: "אורחים", helper: "אישורי הגעה, סיכומים וייצוא" },
  { id: "completion", label: "סיום", helper: "המסר והפעולה האחרונה" },
  { id: "design", label: "עיצוב ופרסום", helper: "בוחרים אווירה ומקבלים קישור" },
];

export const DESIGN_PRESETS = [
  { id: "blush", name: "אישי וחם", helper: "רך, קרוב ומרגש", accent: "#ee5570", soft: "#fff0f3", card: "#ffffff", icon: "♥" },
  { id: "violet", name: "חגיגי", helper: "צבעוני עם נוכחות", accent: "#6a50b8", soft: "#f1edff", card: "#ffffff", icon: "◆" },
  { id: "garden", name: "טבעי", helper: "רגוע, נקי ונעים", accent: "#2f8a6c", soft: "#eaf8f2", card: "#ffffff", icon: "❋" },
  { id: "sun", name: "שמח", helper: "בהיר, קליל ומזמין", accent: "#d88a19", soft: "#fff6dd", card: "#fffdf8", icon: "☀" },
] as const;

export type FeatureStage = "opening" | "questions" | "completion";

export type ElementDefinition = {
  key: ElementStyleKey;
  icon: string;
  title: string;
  description: string;
  visibilityKey?: keyof TemplateConfig;
  required?: boolean;
};

export type ToolboxItem = ToolboxRow & {
  styleKey?: ElementStyleKey;
  screen: PreviewScreen;
  onToggle?: (value: boolean) => void;
};

export const NAV_FEATURE_KEYS = ["showCalendar", "showAppleCalendar", "showWaze", "showGoogleMaps"] as const;
export const SHARE_FEATURE_KEYS = ["showWhatsApp", "showTelegram", "showCopy"] as const;

export function elementGroup(key: ElementStyleKey): ToolboxGroupId {
  if (key === "emoji" || key === "decorations") return "look";
  if (key === "countdown" || key === "venue" || key === "calendar") return "place";
  if (key === "shareButtons" || key === "answerRecap") return "share";
  if (["waxEnvelope", "memories", "guestCounter", "djSong", "voucher", "candle", "scratch", "musicPlayer"].includes(key)) return "experience";
  return "content";
}

export function featureGroup(key: string): ToolboxGroupId {
  if ((NAV_FEATURE_KEYS as readonly string[]).includes(key)) return "place";
  if ((SHARE_FEATURE_KEYS as readonly string[]).includes(key) || key === "showAnswerRecap") return "share";
  if (key === "showEmoji" || key === "showFallingEmojis") return "look";
  return "experience";
}

export function lockFeature(plan: PlanType, feature: PlanFeatureId | null | undefined): PlanFeatureId | undefined {
  if (!feature) return undefined;
  return planLockLabel(feature, plan) ? feature : undefined;
}

export const OPENING_ELEMENTS: ElementDefinition[] = [
  { key: "introLabel", icon: "🏷️", title: "תווית עליונה", description: "הטקסט הקטן שמציג את סוג העמוד", visibilityKey: "showIntroLabel" },
  { key: "emoji", icon: "😊", title: "סמל ראשי", description: "האימוג׳י שמוביל את החוויה", visibilityKey: "showEmoji" },
  { key: "greeting", icon: "👋", title: "ברכה אישית", description: "שורת שלום עם שם הנמען", visibilityKey: "showGreeting" },
  { key: "headline", icon: "T", title: "כותרת ראשית", description: "המסר המרכזי של הפתיחה", required: true },
  { key: "subtitle", icon: "¶", title: "תיאור פתיחה", description: "הטקסט שמסביר מה מחכה בהמשך", required: true },
  { key: "highlights", icon: "•", title: "פרטים חשובים", description: "תאריך, מקום או נקודות קצרות", visibilityKey: "showHighlights" },
  { key: "primaryButton", icon: "↵", title: "כפתור התחלה", description: "הפעולה שמובילה לשלב הבא", required: true },
  { key: "decorations", icon: "✨", title: "קישוטי רקע", description: "אימוג׳ים שנעים ברקע כל הזמן", visibilityKey: "showFallingEmojis" },
];

export const QUESTION_ELEMENTS: ElementDefinition[] = [
  { key: "question", icon: "?", title: "כותרת השאלה", description: "השאלה, ההסבר ומספר השלב", required: true },
  { key: "options", icon: "☷", title: "אפשרויות תשובה", description: "הכרטיסים שהמבקר יכול לבחור", required: true },
  { key: "primaryButton", icon: "↵", title: "כפתור המשך", description: "מעבר לשאלה הבאה או לסיום", required: true },
];

export const COMPLETION_ELEMENTS: ElementDefinition[] = [
  { key: "resultLabel", icon: "🏷️", title: "תווית הסיום", description: "הטקסט הקטן מעל הכותרת", required: true },
  { key: "resultTitle", icon: "T", title: "כותרת הסיום", description: "המסר המרכזי שמופיע בסוף", required: true },
  { key: "resultText", icon: "¶", title: "הודעת הסיום", description: "ברכה, תודה או הסבר על ההמשך", required: true },
];

export const ELEMENT_LABELS: Record<ElementStyleKey, string> = {
  introLabel: "תווית עליונה",
  emoji: "סמל ראשי",
  greeting: "ברכה אישית",
  headline: "כותרת ראשית",
  subtitle: "תיאור פתיחה",
  highlights: "פרטים חשובים",
  primaryButton: "כפתור",
  decorations: "קישוטי רקע",
  countdown: "ספירה לאחור",
  venue: "כרטיס מקום",
  calendar: "יומן וניווט",
  memories: "מצגת זיכרונות",
  waxEnvelope: "מעטפת שעווה",
  question: "כותרת השאלה",
  options: "אפשרויות תשובה",
  guestCounter: "מונה אורחים",
  djSong: "בקשת שיר",
  resultLabel: "תווית הסיום",
  resultTitle: "כותרת הסיום",
  resultText: "הודעת הסיום",
  voucher: "שובר מתנה",
  candle: "כיבוי הנר",
  scratch: "כרטיס גירוד",
  answerRecap: "סיכום תשובות",
  shareButtons: "כפתורי שיתוף",
  musicPlayer: "נגן מוזיקה",
};


export const CORE_FEATURE_KEYS = ["showHighlights", "showEmoji", "showFallingEmojis"] as const;

export function featureStyleKey(key: TemplateFeature["key"]): ElementStyleKey {
  if (key === "showScratchCard") return "scratch";
  if (key === "showCandle") return "candle";
  if (key === "showCountdown") return "countdown";
  if (key === "showVenueCard") return "venue";
  if (key === "showGuests") return "guestCounter";
  if (key === "showDjSong") return "djSong";
  if (["showCalendar", "showAppleCalendar", "showWaze", "showGoogleMaps"].includes(key)) return "calendar";
  if (key === "showVoucher") return "voucher";
  if (key === "showMemoriesSlider") return "memories";
  if (key === "showWaxEnvelope") return "waxEnvelope";
  if (["showWhatsApp", "showTelegram", "showCopy"].includes(key)) return "shareButtons";
  if (key === "showAnswerRecap") return "answerRecap";
  if (key === "showHighlights") return "highlights";
  if (key === "showEmoji") return "emoji";
  if (key === "showMusicPlayer") return "musicPlayer";
  return "decorations";
}

export function featureBelongsToStage(feature: TemplateFeature, stage: FeatureStage) {
  if (stage === "questions") return ["showGuests", "showDjSong"].includes(feature.key);
  if (stage === "completion") return ["showScratchCard", "showCandle", "showVoucher", "showWhatsApp", "showTelegram", "showCopy", "showAnswerRecap"].includes(feature.key);
  return !["showGuests", "showDjSong", "showScratchCard", "showCandle", "showVoucher", "showWhatsApp", "showTelegram", "showCopy", "showAnswerRecap"].includes(feature.key);
}
