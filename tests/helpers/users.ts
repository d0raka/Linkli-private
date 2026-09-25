import { ensureDatabase } from "@/db";
import { createSession, hashPassword } from "@/lib/auth";
import { billingPlanValue, type PlanType } from "@/lib/plans";
import { getTemplate, safeConfig, type TemplateConfig } from "@/lib/templates";

export const SESSION_COOKIE = "__Host-linkli_session";
export const DEFAULT_PASSWORD = "correct-horse-battery-staple-2026";

export type TestUser = { email: string; password: string; plan: PlanType };

export async function createUser(options: {
  email: string;
  displayName?: string;
  plan?: PlanType;
  verified?: boolean;
  password?: string;
  bonusPages?: number;
  withVerificationRow?: boolean;
}): Promise<TestUser> {
  const { email, displayName = "Test User", plan = "free", verified = true, password = DEFAULT_PASSWORD, bonusPages = 0, withVerificationRow = true } = options;
  const db = await ensureDatabase();
  const record = await hashPassword(password);
  const statements = [
    db.prepare("INSERT INTO users (email, display_name, plan, plan_tier, bonus_pages) VALUES (?, ?, ?, ?, ?)").bind(email, displayName, billingPlanValue(plan), plan, bonusPages),
    db.prepare("INSERT INTO auth_credentials (email, password_hash, password_salt, password_iterations) VALUES (?, ?, ?, ?)").bind(email, record.hash, record.salt, record.iterations),
  ];
  if (withVerificationRow) {
    statements.push(db.prepare("INSERT INTO email_verifications (user_email, verified_at) VALUES (?, ?)").bind(email, verified ? "2026-01-01 00:00:00" : null));
  }
  await db.batch(statements);
  return { email, password, plan };
}

export async function sessionCookieFor(email: string) {
  const token = await createSession(email);
  return { [SESSION_COOKIE]: token };
}

export async function createProject(ownerEmail: string, options: {
  id?: string;
  slug?: string;
  templateId?: string;
  published?: boolean;
  config?: Partial<TemplateConfig>;
  accessPasswordHash?: string | null;
  title?: string;
} = {}) {
  const db = await ensureDatabase();
  const templateId = options.templateId ?? "date";
  const id = options.id ?? crypto.randomUUID();
  const slug = options.slug ?? `page-${id.slice(0, 6)}`;
  const config = safeConfig({ ...getTemplate(templateId).config, ...options.config }, templateId);
  await db.prepare(
    "INSERT INTO projects (id, owner_email, title, slug, template_id, config_json, published, access_password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(id, ownerEmail, options.title ?? getTemplate(templateId).name, slug, templateId, JSON.stringify(config), options.published ? 1 : 0, options.accessPasswordHash ?? null).run();
  return { id, slug, templateId, config };
}

export async function storeMedia(projectId: string, table: "project_backgrounds" | "project_emoji_images", bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])) {
  const db = await ensureDatabase();
  await db.prepare(`INSERT OR REPLACE INTO ${table} (project_id, mime, data) VALUES (?, 'image/jpeg', ?)`).bind(projectId, bytes).run();
}

export async function mediaExists(projectId: string, table: "project_backgrounds" | "project_emoji_images") {
  const db = await ensureDatabase();
  const row = await db.prepare(`SELECT project_id FROM ${table} WHERE project_id = ?`).bind(projectId).first();
  return Boolean(row);
}
