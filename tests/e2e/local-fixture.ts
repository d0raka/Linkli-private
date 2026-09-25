import { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash, createHmac, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { BrowserContext, APIRequestContext } from "@playwright/test";

/** Local D1 fixtures only: never execute against a remote or production URL. */
export async function localUser(request: APIRequestContext, plan: "free" | "pro" | "max" = "free") {
  const origin = process.env.E2E_BASE_URL || "http://localhost:3000";
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error("Fixtures require localhost");
  await request.get(`${origin}/api/health`);
  const dir = resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  const candidates = readdirSync(dir).filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  if (candidates.length !== 1) throw new Error("Expected one local D1 database");
  const db = new DatabaseSync(resolve(dir, candidates[0]));
  db.exec("PRAGMA busy_timeout=10000");
  const email = `e2e-${randomUUID()}@linkli.test`;
  const password = randomUUID();
  const peppered = createHmac("sha256", "linkli-local-development-pepper").update(password).digest("hex");
  const hash = await bcrypt.hash(peppered, 12);
  const token = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  db.prepare("INSERT INTO users (email,display_name,plan,plan_tier) VALUES (?,?,?,?)").run(email,"מארחת בדיקה",plan === "free" ? "free" : "plus",plan);
  db.prepare("INSERT INTO auth_credentials (email,password_hash,password_salt,password_iterations) VALUES (?,?,?,12)").run(email,hash,"bcrypt-hmac-sha256");
  db.prepare("INSERT INTO email_verifications (user_email,verified_at) VALUES (?,CURRENT_TIMESTAMP)").run(email);
  const now = Math.floor(Date.now()/1000);
  db.prepare("INSERT INTO sessions (id,user_email,expires_at,last_seen_at) VALUES (?,?,?,?)").run(createHash("sha256").update(token).digest("hex"),email,now+3600,now);
  return { email,password,token,db,origin };
}
export async function signInFixture(context: BrowserContext, user: Awaited<ReturnType<typeof localUser>>) {
  await context.addCookies([{name:"linkli_session",value:user.token,url:user.origin,httpOnly:true,sameSite:"Lax"}]);
}
