/**
 * The birthday wizard keeps its personal answers in sessionStorage and passes only an opaque
 * draft id through URLs, so recipient names and private memories never reach query strings,
 * emails, logs or browser history.
 */
export type BirthdayTone = "warm" | "funny" | "emotional";
export type BirthdayDraft = { recipient: string; sender: string; relationship: string; memory: string; tone: BirthdayTone; whatsappText?: string };

const PREFIX = "linkli-birthday-draft:";
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function birthdayDraftId(seed: string) {
  return `b${seed.replace(/[^A-Za-z0-9_-]/g, "")}`.slice(0, 64);
}

export function normalizeBirthdayDraft(value: unknown): BirthdayDraft {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const text = (candidate: unknown, max: number) => (typeof candidate === "string" ? candidate : "").slice(0, max);
  const tone = input.tone;
  return {
    recipient: text(input.recipient, 60),
    sender: text(input.sender, 60),
    relationship: text(input.relationship, 60),
    memory: text(input.memory, 180),
    whatsappText: text(input.whatsappText, 500),
    tone: tone === "funny" || tone === "emotional" ? tone : "warm",
  };
}

export function writeBirthdayDraft(id: string, draft: BirthdayDraft) {
  if (!ID_PATTERN.test(id)) return;
  try {
    sessionStorage.setItem(`${PREFIX}${id}`, JSON.stringify(draft));
  } catch {
    /* private mode or quota: the editor simply starts from the template */
  }
}

export function readBirthdayDraft(id: string | null): BirthdayDraft | null {
  if (!id || !ID_PATTERN.test(id)) return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${id}`);
    return raw ? normalizeBirthdayDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearBirthdayDraft(id: string | null) {
  if (!id || !ID_PATTERN.test(id)) return;
  try {
    sessionStorage.removeItem(`${PREFIX}${id}`);
  } catch {
    /* ignore */
  }
}

export type GuidedTemplate = "birthday" | "event" | "wedding";
export type EventDraft = { name: string; partner: string; date: string; venue: string; story: string; tone: "formal" | "warm" | "casual"; whatsappText: string };
export type GuidedDraft = BirthdayDraft | EventDraft;
const guidedPrefix = (template: GuidedTemplate) => `linkli-${template}-draft:`;
export function normalizeEventDraft(value: unknown): EventDraft {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const text = (key: string, max: number) => typeof input[key] === "string" ? String(input[key]).slice(0, max) : "";
  return { name: text("name", 60), partner: text("partner", 60), date: text("date", 16), venue: text("venue", 80), story: text("story", 240), whatsappText: text("whatsappText", 500), tone: input.tone === "formal" || input.tone === "casual" ? input.tone : "warm" };
}
export function isGuidedTemplate(value: string): value is GuidedTemplate { return ["birthday", "event", "wedding"].includes(value); }
export function writeGuidedDraft(template: GuidedTemplate, id: string, draft: GuidedDraft) {
  if (!ID_PATTERN.test(id)) return;
  try { sessionStorage.setItem(`${guidedPrefix(template)}${id}`, JSON.stringify(template === "birthday" ? normalizeBirthdayDraft(draft) : normalizeEventDraft(draft))); } catch { /* private mode */ }
}
export function readGuidedDraft(template: GuidedTemplate, id: string | null): GuidedDraft | null {
  if (!id || !ID_PATTERN.test(id)) return null;
  try { const raw = sessionStorage.getItem(`${guidedPrefix(template)}${id}`); return raw ? (template === "birthday" ? normalizeBirthdayDraft(JSON.parse(raw)) : normalizeEventDraft(JSON.parse(raw))) : null; } catch { return null; }
}
export function clearGuidedDraft(template: GuidedTemplate, id: string | null) {
  if (!id || !ID_PATTERN.test(id)) return;
  try { sessionStorage.removeItem(`${guidedPrefix(template)}${id}`); if (sessionStorage.getItem(`linkli-${template}-active-draft`) === id) sessionStorage.removeItem(`linkli-${template}-active-draft`); } catch { /* private mode */ }
}

/** One resumable draft per occasion in this browser tab. No personal data in its ID. */
export function resumeGuidedDraftId(template: GuidedTemplate) {
  const activeKey = `linkli-${template}-active-draft`;
  try {
    const existing = sessionStorage.getItem(activeKey);
    if (existing && ID_PATTERN.test(existing)) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(activeKey, id);
    return id;
  } catch { return crypto.randomUUID(); }
}
