import { env } from "cloudflare:workers";
import { schemaStatements } from "./schema";

let initialized: Promise<void> | null = null;

export function getDatabase(): any {
  if (!env.DB) throw new Error("Database binding is unavailable");
  return env.DB;
}

export function resetDatabaseInitialization() {
  initialized = null;
}

export async function ensureDatabase() {
  if (!initialized) {
    const db = getDatabase();
    initialized = applySchema(db).catch((error) => {
      initialized = null;
      throw error;
    });
  }
  await initialized;
  return getDatabase();
}

async function applySchema(db: any) {
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  await migrateAuthTokens(db);
  await migrateUserEntitlements(db);
  await migrateProjects(db);
  await migrateMediaKeys(db);
  await migrateBilling(db);
  await migrateRsvp(db);
  await backfillEmailVerifications(db);
}

/**
 * Accounts created before email verification existed have no verification row. Verification
 * now fails closed, so those legacy accounts are recorded as verified once; rows that already
 * exist (including pending, unverified ones) are left untouched.
 */
export async function backfillEmailVerifications(db: any) {
  await db.prepare(
    "INSERT OR IGNORE INTO email_verifications (user_email, verified_at) SELECT email, CURRENT_TIMESTAMP FROM users",
  ).run();
}

async function migrateAuthTokens(db: any) {
  const table = await db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'auth_tokens'").first();
  const sql = String(table?.sql || "");
  if (sql.includes("change_password") && sql.includes("payload")) return;
  await db.batch([
    db.prepare(`CREATE TABLE auth_tokens_v2 (
      token_hash TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password', 'change_password', 'delete_account')),
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
    )`),
    db.prepare(`INSERT INTO auth_tokens_v2 (token_hash, user_email, purpose, expires_at, used_at, created_at)
      SELECT token_hash, user_email, purpose, expires_at, used_at, created_at FROM auth_tokens`),
    db.prepare("DROP TABLE auth_tokens"),
    db.prepare("ALTER TABLE auth_tokens_v2 RENAME TO auth_tokens"),
    db.prepare("CREATE INDEX IF NOT EXISTS auth_tokens_user_purpose_idx ON auth_tokens(user_email, purpose)"),
    db.prepare("CREATE INDEX IF NOT EXISTS auth_tokens_expires_idx ON auth_tokens(expires_at)"),
  ]);
}

async function tableColumns(db: any, table: string) {
  const rows = await db.prepare(`PRAGMA table_info(${table})`).all();
  const list = Array.isArray(rows?.results) ? rows.results : Array.isArray(rows) ? rows : [];
  return new Set(list.map((row: { name?: unknown }) => String(row.name || "")));
}

async function migrateUserEntitlements(db: any) {
  const columns = await tableColumns(db, "users");
  const additions: string[] = [];
  if (!columns.has("plan_tier")) additions.push("ALTER TABLE users ADD COLUMN plan_tier TEXT NOT NULL DEFAULT 'free'");
  if (!columns.has("referral_code")) additions.push("ALTER TABLE users ADD COLUMN referral_code TEXT");
  if (!columns.has("referred_by")) additions.push("ALTER TABLE users ADD COLUMN referred_by TEXT");
  if (!columns.has("bonus_pages")) additions.push("ALTER TABLE users ADD COLUMN bonus_pages INTEGER NOT NULL DEFAULT 0");
  if (!columns.has("referral_rewarded")) additions.push("ALTER TABLE users ADD COLUMN referral_rewarded INTEGER NOT NULL DEFAULT 0");
  for (const statement of additions) {
    try { await db.prepare(statement).run(); } catch { /* column may already exist */ }
  }
  await db.prepare("UPDATE users SET plan_tier = 'pro' WHERE plan = 'plus' AND (plan_tier IS NULL OR TRIM(plan_tier) = '' OR plan_tier = 'free')").run();
  await db.prepare("UPDATE users SET referral_code = NULL WHERE TRIM(COALESCE(referral_code, '')) = ''").run();
  try { await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code)").run(); } catch { /* unique index may already exist */ }
}

async function migrateProjects(db: any) {
  const columns = await tableColumns(db, "projects");
  if (!columns.has("access_password_hash")) {
    try { await db.prepare("ALTER TABLE projects ADD COLUMN access_password_hash TEXT").run(); } catch { /* column may already exist */ }
  }
}

async function migrateMediaKeys(db: any) {
  for (const table of ["project_backgrounds", "project_emoji_images"]) {
    const columns = await tableColumns(db, table);
    if (!columns.has("object_key")) {
      try { await db.prepare(`ALTER TABLE ${table} ADD COLUMN object_key TEXT`).run(); } catch { /* column may already exist */ }
    }
  }
}

async function migrateBilling(db: any) {
  const columns = await tableColumns(db, "billing_events");
  const additions: string[] = [];
  if (!columns.has("payload_json")) additions.push("ALTER TABLE billing_events ADD COLUMN payload_json TEXT");
  if (!columns.has("provider_event_at")) additions.push("ALTER TABLE billing_events ADD COLUMN provider_event_at TEXT");
  if (!columns.has("sequence")) additions.push("ALTER TABLE billing_events ADD COLUMN sequence INTEGER");
  if (!columns.has("status")) additions.push("ALTER TABLE billing_events ADD COLUMN status TEXT NOT NULL DEFAULT 'processed'");
  if (!columns.has("processed_at")) additions.push("ALTER TABLE billing_events ADD COLUMN processed_at TEXT");
  for (const statement of additions) {
    try { await db.prepare(statement).run(); } catch { /* column may already exist */ }
  }
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS billing_customers (
      user_email TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'hosted',
      provider_customer_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'hosted',
      provider_order_id TEXT,
      plan TEXT NOT NULL,
      price_id TEXT,
      amount_minor INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'ILS',
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'refunded', 'chargeback', 'failed')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      paid_at TEXT,
      provider_event_at TEXT
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_email, created_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      provider_subscription_id TEXT,
      plan TEXT NOT NULL,
      price_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancel_scheduled', 'cancelled', 'expired')),
      current_period_end TEXT,
      cancel_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_email, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS billing_events_customer_idx ON billing_events(customer_email, provider_event_at)"),
  ]);
}

async function migrateRsvp(db: any) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS rsvp_responses (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('yes', 'maybe', 'no')),
      guest_count INTEGER NOT NULL DEFAULT 1,
      plus_ones_json TEXT,
      song TEXT,
      answers_json TEXT,
      name TEXT NOT NULL,
      contact_hash TEXT,
      response_token_hash TEXT NOT NULL UNIQUE,
      ip_hash TEXT,
      consent_at TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS rsvp_responses_project_idx ON rsvp_responses(project_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS rsvp_responses_token_idx ON rsvp_responses(response_token_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS rsvp_responses_contact_idx ON rsvp_responses(project_id, contact_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS rsvp_responses_expires_idx ON rsvp_responses(expires_at)"),
  ]);
}

export function runtimeValue(name: string): string | null {
  const value = (env as unknown as Record<string, unknown>)[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
