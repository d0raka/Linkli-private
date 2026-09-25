import { beforeAll, beforeEach } from "vitest";
import { ensureDatabase, resetDatabaseInitialization } from "@/db";
import { resetEnv } from "../shims/cloudflare-workers";
import { clearOutboundRequests } from "./fetch-guard";
import { createFakeD1, type FakeD1Database } from "./fake-d1";
import { createFakeR2 } from "./fake-r2";

export const TEST_ENV = {
  AUTH_PEPPER: "test-pepper-do-not-use-in-production",
  ADMIN_EMAILS: "admin@linkli.test",
  RESEND_API_KEY: "re_test_key",
  EMAIL_FROM: "Linkli <account@linkli.test>",
  BILLING_WEBHOOK_SECRET: "whsec_test_secret",
};

let database: FakeD1Database | null = null;

export function testDatabase() {
  if (!database) database = createFakeD1();
  return database;
}

/**
 * Registers a fresh schema once per test file and truncates all tables before each test.
 * `extraEnv` lets a suite override runtime variables (for example billing URLs).
 */
export function useTestDatabase(extraEnv: Record<string, unknown> = {}) {
  beforeAll(async () => {
    resetDatabaseInitialization();
    const db = testDatabase();
    resetEnv({ DB: db, MEDIA: createFakeR2(), ...TEST_ENV, ...extraEnv });
    await ensureDatabase();
  });
  beforeEach(() => {
    testDatabase().truncateAll();
    clearOutboundRequests();
  });
  return testDatabase;
}
