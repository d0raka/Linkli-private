import { env } from "cloudflare:workers";
import { schemaStatements } from "./schema";

let initialized: Promise<void> | null = null;

export function getDatabase(): any {
  if (!env.DB) throw new Error("Database binding is unavailable");
  return env.DB;
}

export async function ensureDatabase() {
  if (!initialized) {
    const db = getDatabase();
    initialized = db.batch(schemaStatements.map((statement) => db.prepare(statement))).then(() => undefined);
  }
  await initialized;
  return getDatabase();
}

export function runtimeValue(name: string): string | null {
  const value = (env as unknown as Record<string, unknown>)[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
