import { describe, expect, it } from "vitest";
import { ensureDatabase, resetDatabaseInitialization } from "@/db";
import { TEST_ENV } from "../setup/db";
import { createFakeD1 } from "../setup/fake-d1";
import { resetEnv } from "../shims/cloudflare-workers";

describe("M7: schema apply does not die on an older billing_events table", () => {
  it("adds provider_event_at to a table created before that column existed", async () => {
    const db = createFakeD1();
    await db.exec(`CREATE TABLE billing_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    resetDatabaseInitialization();
    resetEnv({ DB: db, ...TEST_ENV });
    await ensureDatabase();
    const info = await db.prepare("PRAGMA table_info(billing_events)").all() as { results: Array<{ name: string }> };
    expect(info.results.map((column) => column.name)).toContain("provider_event_at");
    await db.prepare(
      "INSERT INTO billing_events (event_id, event_type, customer_email, provider_event_at, status) VALUES (?, ?, ?, ?, ?)",
    ).bind("evt_1", "paid", "owner@linkli.test", "2026-01-01T00:00:00.000Z", "processed").run();
  });

  it("retries initialization after a failed first attempt", async () => {
    resetDatabaseInitialization();
    resetEnv({ ...TEST_ENV });
    await expect(ensureDatabase()).rejects.toThrow(/Database binding is unavailable/);
    const db = createFakeD1();
    resetEnv({ DB: db, ...TEST_ENV });
    await ensureDatabase();
    const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").first();
    expect(tables).toMatchObject({ name: "users" });
  });
});
