import { describe, expect, it } from "vitest";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "./setup/db";
import { createFakeD1 } from "./setup/fake-d1";

describe("test harness", () => {
  const db = useTestDatabase();

  it("applies the runtime schema to a clean database", async () => {
    const tables = db().tableNames();
    for (const table of ["users", "projects", "project_backgrounds", "project_emoji_images", "sessions", "auth_tokens", "email_verifications", "billing_events", "billing_customers", "orders", "subscriptions", "rate_limits"]) {
      expect(tables).toContain(table);
    }
  });

  it("returns D1-shaped results from prepare/bind/run/first/all", async () => {
    const database = await ensureDatabase();
    const inserted = await database.prepare("INSERT INTO users (email, display_name) VALUES (?, ?)").bind("a@linkli.test", "A").run();
    expect(inserted.meta.changes).toBe(1);
    const row = await database.prepare("SELECT email, plan FROM users WHERE email = ?").bind("a@linkli.test").first();
    expect(row).toMatchObject({ email: "a@linkli.test", plan: "free" });
    const all = await database.prepare("SELECT email FROM users").all();
    expect(all.results).toHaveLength(1);
    expect(await database.prepare("SELECT plan FROM users WHERE email = ?").bind("a@linkli.test").first("plan")).toBe("free");
  });

  it("rolls back a whole batch when one statement fails", async () => {
    const database = createFakeD1();
    await database.exec("CREATE TABLE t (id INTEGER PRIMARY KEY)");
    await expect(database.batch([
      database.prepare("INSERT INTO t (id) VALUES (?)").bind(1),
      database.prepare("INSERT INTO t (id) VALUES (?)").bind(1),
    ])).rejects.toThrow();
    expect(await database.prepare("SELECT COUNT(*) AS total FROM t").first("total")).toBe(0);
  });

  it("enforces foreign keys like D1", async () => {
    const database = await ensureDatabase();
    await expect(
      database.prepare("INSERT INTO projects (id, owner_email, title, slug, template_id, config_json) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), "missing@linkli.test", "t", "slug-1", "date", "{}").run(),
    ).rejects.toThrow(/FOREIGN KEY/);
  });

  it("rejects undefined bind parameters the way D1 does", async () => {
    const database = await ensureDatabase();
    expect(() => database.prepare("SELECT ?").bind(undefined)).toThrow(/undefined/);
  });
});
