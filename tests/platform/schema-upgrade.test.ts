import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ensureDatabase, resetDatabaseInitialization } from "@/db";
import { TEST_ENV } from "../setup/db";
import { createFakeD1 } from "../setup/fake-d1";
import { resetEnv } from "../shims/cloudflare-workers";

describe("M8: runtime schema upgrades a v1 D1", () => {
  it("adds later columns and tables after only drizzle/0000 exists", async () => {
    const db = createFakeD1();
    await db.exec(readFileSync(new URL("../../drizzle/0000_linkli.sql", import.meta.url), "utf8"));
    resetDatabaseInitialization();
    resetEnv({ DB: db, ...TEST_ENV });
    await ensureDatabase();

    const projectColumns = await db.prepare("PRAGMA table_info(projects)").all() as { results: Array<{ name: string }> };
    expect(projectColumns.results.map((column) => column.name)).toContain("access_password_hash");
    const userColumns = await db.prepare("PRAGMA table_info(users)").all() as { results: Array<{ name: string }> };
    expect(userColumns.results.map((column) => column.name)).toContain("plan_tier");
    expect(db.tableNames()).toEqual(expect.arrayContaining([
      "users",
      "projects",
      "rsvp_responses",
      "orders",
      "marketing_leads",
      "auth_credentials",
    ]));
  });
});
