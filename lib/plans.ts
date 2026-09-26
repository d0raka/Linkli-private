export const PLAN_IDS = ["free", "pro", "max", "business"] as const;
export type PlanType = (typeof PLAN_IDS)[number];
export type PaidPlanType = Exclude<PlanType, "free">;

export const PLAN_PRICES: Record<PaidPlanType, {
  priceId: string;
  amountMinor: number;
  currency: "ILS";
  recurring: boolean;
}> = {
  pro: { priceId: "linkli-pro", amountMinor: 1990, currency: "ILS", recurring: false },
  max: { priceId: "linkli-max", amountMinor: 6900, currency: "ILS", recurring: false },
  business: { priceId: "linkli-business", amountMinor: 9999, currency: "ILS", recurring: true },
};

export function catalogPrice(plan: PaidPlanType) {
  return PLAN_PRICES[plan];
}

export function planFromPriceId(priceId?: string | null): PaidPlanType | null {
  const id = String(priceId || "").trim().toLowerCase();
  if (id === "linkli-business" || id === "business") return "business";
  if (id === "linkli-max" || id === "max") return "max";
  if (id === "linkli-pro" || id === "linkli-plus" || id === "pro" || id === "plus") return "pro";
  return null;
}

export const PROJECT_LIMITS = {
  free: 1,
  plus: 3,
  pro: 3,
  max: 10,
  business: 10_000,
} as const;

export const PLAN_CATALOG: Array<{
  id: PlanType;
  name: string;
  price: string;
  cadence: string;
  summary: string;
  featured?: boolean;
  waitlist?: boolean;
  features: string[];
  blocked: string[];
}> = [
  {
    id: "free",
    name: "חינם",
    price: "₪0",
    cadence: "ללא הגבלת זמן",
    summary: "עמוד מפורסם אחד · טיוטות ללא הגבלה",
    features: ["עמוד אחד שאפשר לשלוח לחברים", "משנים שם, ברכה וסמל", "הקישור נשלח בוואטסאפ", "טיוטות בלי הגבלה, עד שזה מרגיש נכון"],
    blocked: ["יופיע עליו סימן קטן של Linkli", "בלי תמונות מהאלבום ובלי שיר"],
  },
  {
    id: "pro",
    name: "יוצר",
    price: "₪19.90",
    cadence: "תשלום חד-פעמי",
    summary: "שלושה עמודים, בלי הסימן שלנו, עם תמונות ושיר.",
    featured: true,
    features: ["עד 3 עמודים מפורסמים: דייט, יום הולדת או כל רגע אחר", "בלי הסימן של Linkli על העמוד", "תמונות מהאלבום, ושיר שאתם אוהבים", "דייט, חתונה, ברית, מה שצריך", "הקישור יוצא מוואטסאפ כמו כל הודעה"],
    blocked: ["ווייז, יומן ואישורי הגעה נמצאים במסלול אירוע"],
  },
  {
    id: "max",
    name: "אירוע",
    price: "₪69",
    cadence: "תשלום חד-פעמי",
    summary: "עד עשרה עמודים, עם אישורי הגעה וסיסמה.",
    features: ["עד 10 עמודים לאירוע אחד או לכמה", "תמונות, שיר, ובלי הסימן שלנו", "ניווט בלחיצה, בווייז או במפות", "התאריך נכנס ליומן בטלפון", "אישורי הגעה במקום הודעות בקבוצה", "אפשר לנעול את העמוד בסיסמה"],
    blocked: [],
  },
  {
    id: "business",
    name: "ארגונים",
    price: "בקרוב",
    cadence: "רשימת המתנה",
    summary: "לארגונים ששולחים הרבה. נפתח בהדרגה, ואפשר להשאיר פרטים.",
    waitlist: true,
    features: ["כמה עמודים שצריך, בלי לספור", "אישורי הגעה, ווייז ויומן, כמו במסלול אירוע", "כל חבר שמגיע דרככם מוסיף עוד עמוד", "מקום אחד לכל האירועים של הארגון"],
    blocked: [],
  },
];

export function normalizePlan(plan?: string | null): PlanType {
  if (plan === "business") return "business";
  if (plan === "max") return "max";
  if (plan === "pro" || plan === "plus") return "pro";
  return "free";
}

export function isPaidPlan(plan?: string | null) {
  return normalizePlan(plan) !== "free";
}

export function billingPlanValue(plan: PlanType) {
  return plan === "free" ? "free" : "plus";
}

export function getPlanName(plan?: string | null) {
  const normalized = normalizePlan(plan);
  if (normalized === "business") return "ארגונים";
  if (normalized === "max") return "אירוע";
  if (normalized === "pro") return "יוצר";
  return "חינם";
}

export function pageLimit(plan?: string | null, bonusPages = 0) {
  const normalized = normalizePlan(plan);
  const base = PROJECT_LIMITS[normalized];
  if (normalized === "business") return PROJECT_LIMITS.business;
  return base + Math.max(0, Math.floor(bonusPages));
}

export function canRemoveBranding(plan?: string | null) {
  return isPaidPlan(plan);
}

export function canUseCustomDomain(plan?: string | null) {
  return normalizePlan(plan) === "max" || normalizePlan(plan) === "business";
}

export function parseCheckoutPlan(value: unknown): PaidPlanType {
  if (value === "max" || value === "business" || value === "pro") return value;
  if (value === "plus") return "pro";
  return "pro";
}

export function parsePurchasablePlan(value: unknown): Exclude<PaidPlanType, "business"> | null {
  if (value === "max") return "max";
  if (value === "pro" || value === "plus") return "pro";
  return null;
}

export function parseAdminPlan(value: unknown): PlanType | null {
  if (value === "plus") return "pro";
  if (value === "free" || value === "pro" || value === "max" || value === "business") return value;
  return null;
}

export function planRank(plan?: string | null) {
  const normalized = normalizePlan(plan);
  if (normalized === "business") return 4;
  if (normalized === "max") return 3;
  if (normalized === "pro") return 2;
  return 1;
}

export function planBadgeLabel(plan?: string | null) {
  return getPlanName(plan);
}

export function hasPlanAccess(current?: string | null, required: PlanType = "free") {
  return planRank(current) >= planRank(required);
}

export const PLAN_FEATURE_IDS = [
  "browse",
  "paidTemplate",
  "photos",
  "music",
  "branding",
  "calendarNav",
  "eventTools",
  "pagePassword",
  "customDomain",
  "morePages",
] as const;
export type PlanFeatureId = (typeof PLAN_FEATURE_IDS)[number];

const PRO_CONFIG_KEYS = new Set(["showMusicPlayer", "musicYoutubeUrl", "hideBranding"]);
const MAX_NAV_KEYS = new Set(["showCalendar", "showAppleCalendar", "showWaze", "showGoogleMaps"]);
const MAX_EVENT_KEYS = new Set(["showGuests", "showDjSong", "showCountdown", "showVenueCard", "rsvpEnabled", "rsvpNotifyOwner", "responseLimit", "retentionDays"]);
const MAX_DOMAIN_KEYS = new Set(["customDomain", "customSubdomain"]);

export function requiredPlanForFeature(feature: PlanFeatureId): PaidPlanType {
  if (feature === "calendarNav" || feature === "eventTools" || feature === "pagePassword" || feature === "customDomain") return "max";
  return "pro";
}

export function featureForConfigKey(key: string): PlanFeatureId | null {
  if (PRO_CONFIG_KEYS.has(key)) return key === "hideBranding" ? "branding" : "music";
  if (MAX_NAV_KEYS.has(key)) return "calendarNav";
  if (MAX_EVENT_KEYS.has(key)) return "eventTools";
  if (MAX_DOMAIN_KEYS.has(key)) return "customDomain";
  return null;
}

export function featureForElementKey(key: string): PlanFeatureId | null {
  if (key === "musicPlayer") return "music";
  if (key === "calendar") return "calendarNav";
  if (key === "guestCounter" || key === "djSong" || key === "countdown" || key === "venue") return "eventTools";
  return featureForConfigKey(key);
}

export function planLockLabel(feature: PlanFeatureId, plan?: string | null): "Pro" | "Max" | null {
  const required = requiredPlanForFeature(feature);
  if (hasPlanAccess(plan, required)) return null;
  return required === "max" ? "Max" : "Pro";
}

export function isPlanGatedValue(value: unknown) {
  if (value === true) return true;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

export function canUsePhotos(plan?: string | null) {
  return isPaidPlan(plan);
}

export function canUsePagePassword(plan?: string | null) {
  return hasPlanAccess(plan, "max");
}

export function paywallCopy(feature: PlanFeatureId): { title: string; body: string } {
  if (feature === "paidTemplate") return { title: "התבנית הזו כלולה ממסלול יוצר", body: "בחינם אפשר להתחיל מתבניות פתוחות. מסלול יוצר פותח את שאר הספרייה, בלי מיתוג, עם תמונות ומוזיקה." };
  if (feature === "photos") return { title: "העלאת תמונות כלולה ממסלול יוצר", body: "אפשר להמשיך עם אימוג'י ורקעים מוכנים. מסלול יוצר מוסיף תמונה אישית לרקע ולסמל." };
  if (feature === "music") return { title: "הנגן כלול ממסלול יוצר", body: "קישור יוטיוב על העמוד נפתח במסלול יוצר, יחד עם הסרת המיתוג והעלאת תמונות." };
  if (feature === "branding") return { title: "הסרת המיתוג כלולה ממסלול יוצר", body: "במסלול החינמי נשאר חותם Linkli בתחתית. מסלול יוצר מנקה את העמוד ומציג רק את מה שיצרת." };
  if (feature === "calendarNav") return { title: "יומן וניווט כלולים ממסלול אירוע", body: "יומן במכשיר, ווייז ומפות נפתחים במסלול אירוע, יחד עם אישורי הגעה וסיסמת כניסה." };
  if (feature === "eventTools") return { title: "כלי אירוע כלולים ממסלול אירוע", body: "מונה אורחים, אישורי הגעה, בקשת שיר, ספירה לאחור וכרטיס מקום שייכים למסלול אירוע." };
  if (feature === "pagePassword") return { title: "סיסמת כניסה כלולה ממסלול אירוע", body: "אפשר להשאיר את העמוד פתוח בקישור. מסלול אירוע מוסיף נעילה, כדי לשתף רק עם מי שצריך." };
  if (feature === "customDomain") return { title: "הדומיין המותאם עדיין לא פתוח", body: "קישור Linkli הוא הכתובת הציבורית כרגע. דומיין אישי ייפתח במסלול ייעודי כשיהיה מוכן." };
  if (feature === "morePages") return { title: "המכסה במסלול הנוכחי מלאה", body: "אפשר למחוק עמוד קיים, או לעבור למסלול עם יותר מקום, כולל עמודים שמתקבלים מהפניות." };
  return { title: "בחירת מסלול", body: "עמוד מפורסם אחד · טיוטות ללא הגבלה. יוצר לשלושה עמודים נקיים. אירוע לאירוע עם יומן, ניווט, אישורי הגעה וסיסמה." };
}

export function parsePlanFeature(value: unknown): PlanFeatureId | null {
  return typeof value === "string" && (PLAN_FEATURE_IDS as readonly string[]).includes(value) ? value as PlanFeatureId : null;
}

export function planFromUserRow(row?: { plan?: unknown; plan_tier?: unknown } | null): PlanType {
  return normalizePlan(String(row?.plan_tier || row?.plan || "free"));
}

export function applyPlanToConfig<T extends Record<string, any>>(config: T, plan?: string | null): T {
  const next: Record<string, any> = { ...config };
  if (!hasPlanAccess(plan, "pro")) {
    next.hideBranding = false;
    next.showMusicPlayer = false;
    next.musicYoutubeUrl = "";
    if (next.bgStyle === "image") next.bgStyle = "soft";
    next.bgImageVersion = 0;
    next.emojiImageVersion = 0;
    if (Array.isArray(next.memorySlides)) next.memorySlides = next.memorySlides.map((slide: Record<string, unknown>) => ({ ...slide, photoKey: undefined }));
  }
  if (!hasPlanAccess(plan, "max")) {
    next.showCalendar = false;
    next.showAppleCalendar = false;
    next.showWaze = false;
    next.showGoogleMaps = false;
    next.showGuests = false;
    next.showDjSong = false;
    next.showCountdown = false;
    next.showVenueCard = false;
    next.rsvpEnabled = false;
    next.rsvpNotifyOwner = false;
    next.customDomain = "";
    next.customSubdomain = "";
  }
  return next as T;
}

export function preserveGatedConfig<T extends Record<string, any>>(incoming: T, stored: T, plan?: string | null): T {
  const next: Record<string, any> = { ...incoming };
  if (!hasPlanAccess(plan, "pro")) {
    next.hideBranding = stored.hideBranding;
    next.showMusicPlayer = stored.showMusicPlayer;
    next.musicYoutubeUrl = stored.musicYoutubeUrl;
    next.bgImageVersion = stored.bgImageVersion;
    next.emojiImageVersion = stored.emojiImageVersion;
    if (incoming.bgStyle === "image" || stored.bgStyle === "image") next.bgStyle = stored.bgStyle;
  }
  if (!hasPlanAccess(plan, "max")) {
    next.showCalendar = stored.showCalendar;
    next.showAppleCalendar = stored.showAppleCalendar;
    next.showWaze = stored.showWaze;
    next.showGoogleMaps = stored.showGoogleMaps;
    next.showGuests = stored.showGuests;
    next.showDjSong = stored.showDjSong;
    next.showCountdown = stored.showCountdown;
    next.showVenueCard = stored.showVenueCard;
    next.rsvpEnabled = stored.rsvpEnabled;
    next.rsvpNotifyOwner = stored.rsvpNotifyOwner;
    next.responseLimit = stored.responseLimit;
    next.retentionDays = stored.retentionDays;
    next.customDomain = stored.customDomain;
    next.customSubdomain = stored.customSubdomain;
  }
  return next as T;
}

export async function persistPlan(db: any, email: string, nextPlan: PlanType) {
  const plan = normalizePlan(nextPlan);
  const current = await db.prepare("SELECT plan, plan_tier FROM users WHERE email = ?").bind(email).first();
  if (!current) throw new Error("PLAN_PERSIST_FAILED");
  const billing = billingPlanValue(plan);
  if (planFromUserRow(current) === plan && String(current.plan || "") === billing) return plan;
  const result = await db.prepare("UPDATE users SET plan = ?, plan_tier = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?")
    .bind(billing, plan, email).run();
  if (!Number(result?.meta?.changes || 0)) throw new Error("PLAN_PERSIST_FAILED");
  return plan;
}
