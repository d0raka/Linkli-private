import { cookies } from "next/headers";
import { hashAuthToken, randomToken, getProductUser } from "@/lib/auth";
import { sendRsvpOwnerEmail } from "@/lib/email";
import { hasPageAccess } from "@/lib/page-access";
import { applyPlanToConfig, planFromUserRow } from "@/lib/plans";
import { projectFromRow } from "@/lib/projects";
import { RequestError } from "@/lib/security";
import { clampGuestCount } from "@/lib/event-time";
import { plainText } from "@/lib/text";
import { safeConfig, type TemplateConfig } from "@/lib/templates";

export const RSVP_STATUSES = ["yes", "maybe", "no"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

const DEFAULT_RESPONSE_LIMIT = 500;
const DEFAULT_RETENTION_DAYS = 365;
const RSVP_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export type RsvpSettings = {
  enabled: boolean;
  maxGuests: number;
  responseLimit: number;
  retentionDays: number;
  notifyOwner: boolean;
};

export type PublicRsvpInput = Record<string, unknown>;

export type RsvpPublicResult = {
  id: string;
  status: RsvpStatus;
  created: boolean;
  token: string;
};

export type RsvpDashboardRow = {
  id: string;
  status: RsvpStatus;
  guestCount: number;
  plusOnes: string[];
  song: string;
  answers: string[];
  name: string;
  createdAt: string;
  updatedAt: string;
};

function rsvpCookieName(slug: string) {
  return `${process.env.NODE_ENV === "development" ? "linkli_rsvp_" : "__Host-linkli_rsvp_"}${slug}`;
}

export function serializeRsvpCookie(slug: string, token: string) {
  const secure = process.env.NODE_ENV === "development" ? "" : "; Secure";
  return `${rsvpCookieName(slug)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${RSVP_COOKIE_MAX_AGE}${secure}`;
}

export function rsvpSettings(config: TemplateConfig): RsvpSettings {
  const responseLimit = typeof config.responseLimit === "number" ? Math.round(config.responseLimit) : DEFAULT_RESPONSE_LIMIT;
  const retentionDays = typeof config.retentionDays === "number" ? Math.round(config.retentionDays) : DEFAULT_RETENTION_DAYS;
  return {
    enabled: config.rsvpEnabled === true,
    maxGuests: Math.min(20, Math.max(1, config.maxGuests ?? 10)),
    responseLimit: Math.min(5_000, Math.max(1, responseLimit || DEFAULT_RESPONSE_LIMIT)),
    retentionDays: Math.min(730, Math.max(30, retentionDays || DEFAULT_RETENTION_DAYS)),
    notifyOwner: config.rsvpNotifyOwner === true,
  };
}

export function parseRsvpStatus(value: unknown): RsvpStatus | null {
  if (value === "yes" || value === "maybe" || value === "no") return value;
  return null;
}

export function inferRsvpStatus(answers: string[]): RsvpStatus {
  const text = answers.join(" ");
  if (/לא נוכל|לא מגיע|לא אוכל|won't|cannot attend/i.test(text)) return "no";
  if (/לא בטוח|עדיין לא|maybe/i.test(text)) return "maybe";
  return "yes";
}

function parseStringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => plainText(item, maxLength, true))
    .filter(Boolean)
    .slice(0, maxItems);
}

async function hashOptional(value: string) {
  return value ? hashAuthToken(value) : null;
}

function normalizeContact(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) && trimmed.length <= 160) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return "";
}

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown";
}

function parseJsonList(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function mapRow(row: Record<string, unknown>): RsvpDashboardRow {
  return {
    id: String(row.id),
    status: parseRsvpStatus(row.status) || "yes",
    guestCount: Number(row.guest_count || 1),
    plusOnes: parseJsonList(row.plus_ones_json),
    song: String(row.song || ""),
    answers: parseJsonList(row.answers_json),
    name: String(row.name || ""),
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

async function loadPublishedProject(db: any, slug: string, preview = false) {
  const row = await db.prepare(
    `SELECT projects.*, users.email AS owner_email, users.display_name AS owner_name,
            users.plan AS owner_plan, users.plan_tier AS owner_plan_tier
     FROM projects JOIN users ON users.email = projects.owner_email
     WHERE projects.slug = ? ${preview ? "" : "AND projects.published = 1"}`,
  ).bind(slug).first();
  return row as Record<string, unknown> | null;
}

export async function submitPublicRsvp(db: any, request: Request, slug: string, body: PublicRsvpInput): Promise<RsvpPublicResult> {
  const preview = body.preview === true || new URL(request.url).searchParams.get("preview") === "1";
  const row = await loadPublishedProject(db, slug, preview);
  if (!row) throw new RequestError(404, "העמוד לא נמצא");
  if (preview) {
    const owner = await getProductUser();
    if (!owner || owner.email !== row.owner_email) throw new RequestError(403, "מצב בדיקה זמין רק לבעלי העמוד.");
  }
  const passwordHash = typeof row.access_password_hash === "string" ? row.access_password_hash : "";
  if (!preview && passwordHash && !(await hasPageAccess(slug, passwordHash))) {
    throw new RequestError(401, "העמוד מוגן בסיסמה.", "password_required");
  }
  const ownerPlan = planFromUserRow({ plan: row.owner_plan, plan_tier: row.owner_plan_tier });
  const config = applyPlanToConfig(preview && body.previewConfig ? safeConfig(body.previewConfig, String(row.template_id)) : projectFromRow(row).config, ownerPlan);
  const settings = rsvpSettings(config);
  if (!settings.enabled) throw new RequestError(404, "העמוד לא נמצא");

  const name = plainText(body.name, 80, true);
  if (name.length < 2) throw new RequestError(400, "יש למלא שם.");
  if (body.consent !== true) throw new RequestError(400, "נדרשת הסכמה לשמירת המענה.");

  const answers = parseStringList(body.answers, 10, 200);
  const status = parseRsvpStatus(body.status) || inferRsvpStatus(answers);
  const guestCount = clampGuestCount(Number(body.guestCount || 1), settings.maxGuests);
  const plusOnes = parseStringList(body.plusOnes, Math.max(0, guestCount - 1), 80);
  const song = plainText(body.song, 120, true);
  if (preview) return { id: "preview", status, created: false, token: "" };
  const contact = normalizeContact(body.contact);
  const contactHash = await hashOptional(contact);
  const ipHash = await hashAuthToken(clientIp(request));
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + settings.retentionDays * 86_400;
  const cookieToken = (await cookies()).get(rsvpCookieName(slug))?.value || "";
  const cookieHash = /^[0-9a-f]{64}$/i.test(cookieToken) ? await hashAuthToken(cookieToken) : "";

  let existing = cookieHash
    ? await db.prepare("SELECT id FROM rsvp_responses WHERE project_id = ? AND response_token_hash = ?").bind(row.id, cookieHash).first()
    : null;
  if (!existing && contactHash) {
    existing = await db.prepare("SELECT id FROM rsvp_responses WHERE project_id = ? AND contact_hash = ?").bind(row.id, contactHash).first();
  }

  if (existing) {
    await db.prepare(
      `UPDATE rsvp_responses
       SET status = ?, guest_count = ?, plus_ones_json = ?, song = ?, answers_json = ?, name = ?,
           contact_hash = COALESCE(?, contact_hash), ip_hash = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND project_id = ?`,
    ).bind(status, guestCount, JSON.stringify(plusOnes), song, JSON.stringify(answers), name, contactHash, ipHash, existing.id, row.id).run();
    const token = cookieToken && cookieHash ? cookieToken : randomToken();
    if (!cookieHash) {
      await db.prepare("UPDATE rsvp_responses SET response_token_hash = ? WHERE id = ?").bind(await hashAuthToken(token), existing.id).run();
    }
    return { id: String(existing.id), status, created: false, token: cookieHash ? cookieToken : token };
  }

  const counted = await db.prepare("SELECT COUNT(*) AS n FROM rsvp_responses WHERE project_id = ?").bind(row.id).first("n");
  if (Number(counted || 0) >= settings.responseLimit) {
    throw new RequestError(409, "הגענו למכסת המענים לעמוד הזה.", "rsvp_limit");
  }

  const id = crypto.randomUUID();
  const token = randomToken();
  const tokenHash = await hashAuthToken(token);
  await db.prepare(
    `INSERT INTO rsvp_responses (
      id, project_id, status, guest_count, plus_ones_json, song, answers_json, name,
      contact_hash, response_token_hash, ip_hash, consent_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
  ).bind(
    id, row.id, status, guestCount, JSON.stringify(plusOnes), song, JSON.stringify(answers), name,
    contactHash, tokenHash, ipHash, expiresAt,
  ).run();

  if (settings.notifyOwner && typeof row.owner_email === "string") {
    const summary = await dashboardSummary(db, String(row.id));
    await sendRsvpOwnerEmail({
      to: String(row.owner_email),
      displayName: String(row.owner_name || ""),
      pageTitle: String(row.title || "העמוד"),
      guestName: name,
      status,
      total: summary.total,
    });
  }

  if (Math.random() < 0.05) await purgeExpiredRsvps(db);
  return { id, status, created: true, token };
}

async function requireOwnedProject(db: any, projectId: string, ownerEmail: string) {
  const row = await db.prepare("SELECT id FROM projects WHERE id = ? AND owner_email = ?").bind(projectId, ownerEmail).first();
  if (!row) throw new RequestError(404, "העמוד לא נמצא");
  return row;
}

async function dashboardSummary(db: any, projectId: string) {
  const row = await db.prepare(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status = 'yes' THEN 1 ELSE 0 END), 0) AS yes,
            COALESCE(SUM(CASE WHEN status = 'maybe' THEN 1 ELSE 0 END), 0) AS maybe,
            COALESCE(SUM(CASE WHEN status = 'no' THEN 1 ELSE 0 END), 0) AS no,
            COALESCE(SUM(guest_count), 0) AS guests
     FROM rsvp_responses WHERE project_id = ?`,
  ).bind(projectId).first();
  return {
    total: Number(row?.total || 0),
    yes: Number(row?.yes || 0),
    maybe: Number(row?.maybe || 0),
    no: Number(row?.no || 0),
    guests: Number(row?.guests || 0),
  };
}

export async function listProjectRsvps(db: any, projectId: string, ownerEmail: string, offset = 0, limit = 50) {
  await requireOwnedProject(db, projectId, ownerEmail);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const safeOffset = Math.max(0, offset);
  const summary = await dashboardSummary(db, projectId);
  const songRows = await db.prepare(
    "SELECT DISTINCT song FROM rsvp_responses WHERE project_id = ? AND TRIM(COALESCE(song, '')) <> '' ORDER BY song",
  ).bind(projectId).all();
  const songs: string[] = (songRows.results || []).map((row: { song?: unknown }) => String(row.song || "")).filter(Boolean);
  const rows = await db.prepare(
    `SELECT id, status, guest_count, plus_ones_json, song, answers_json, name, created_at, updated_at
     FROM rsvp_responses WHERE project_id = ?
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ).bind(projectId, safeLimit, safeOffset).all();
  return {
    summary,
    songs,
    responses: ((rows.results || []) as Array<Record<string, unknown>>).map((row) => mapRow(row)),
    offset: safeOffset,
    limit: safeLimit,
  };
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function exportProjectRsvpsCsv(db: any, projectId: string, ownerEmail: string) {
  const data = await listProjectRsvps(db, projectId, ownerEmail, 0, 5_000);
  const header = ["id", "status", "guest_count", "name", "song", "plus_ones", "answers", "created_at"];
  const lines = [header.join(",")];
  for (const row of data.responses) {
    lines.push([
      csvCell(row.id),
      csvCell(row.status),
      String(row.guestCount),
      csvCell(row.name),
      csvCell(row.song),
      csvCell(row.plusOnes.join("; ")),
      csvCell(row.answers.join(" | ")),
      csvCell(row.createdAt),
    ].join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export async function deleteProjectRsvp(db: any, projectId: string, ownerEmail: string, responseId: string) {
  await requireOwnedProject(db, projectId, ownerEmail);
  const result = await db.prepare("DELETE FROM rsvp_responses WHERE id = ? AND project_id = ?").bind(responseId, projectId).run();
  if (!Number(result.meta?.changes || 0)) throw new RequestError(404, "המענה לא נמצא");
}

export async function purgeExpiredRsvps(db: any) {
  const now = Math.floor(Date.now() / 1000);
  const result = await db.prepare("DELETE FROM rsvp_responses WHERE expires_at < ?").bind(now).run();
  return Number(result.meta?.changes || 0);
}

export async function deleteRsvpsForOwnerProjects(db: any, ownerEmail: string) {
  await db.prepare("DELETE FROM rsvp_responses WHERE project_id IN (SELECT id FROM projects WHERE owner_email = ?)").bind(ownerEmail).run();
}

export async function deleteRsvpsForProject(db: any, projectId: string, ownerEmail: string) {
  await db.prepare("DELETE FROM rsvp_responses WHERE project_id IN (SELECT id FROM projects WHERE id = ? AND owner_email = ?)").bind(projectId, ownerEmail).run();
}
