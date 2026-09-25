import { NextResponse } from "next/server";
import { ensureDatabase, runtimeValue } from "@/db";
import { HEALTH_ENV, emailConfigured, billingConfigured, missingRequiredEnv } from "@/lib/runtime-env";

export async function GET() {
  const values = Object.fromEntries(HEALTH_ENV.map((key) => [key, runtimeValue(key)]));
  const missing = missingRequiredEnv(values, process.env.NODE_ENV || "production");

  let db: "ok" | "error" = "error";
  try {
    const database = await ensureDatabase();
    const row = await database.prepare("SELECT 1 AS ok").first();
    if (row && Number((row as { ok?: number }).ok) === 1) db = "ok";
  } catch {
    db = "error";
  }

  const ok = missing.length === 0 && db === "ok";
  return NextResponse.json(
    { ok, db, emailConfigured: emailConfigured(values), billingConfigured: billingConfigured(values), missing },
    {
      status: ok ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
