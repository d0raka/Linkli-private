import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { claimAuthToken } from "@/lib/account-security";
import { errorResponse, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 2_048);
    const token = typeof body.token === "string" && /^[0-9a-f]{64}$/i.test(body.token) ? body.token : "";
    if (!token) throw new RequestError(400, "קישור האימות אינו תקין.");
    const db = await ensureDatabase();
    const claimed = await claimAuthToken(db, token, "verify_email");
    if (!claimed) throw new RequestError(400, "קישור האימות אינו תקף או שכבר נעשה בו שימוש.");
    await db.prepare(
      `INSERT INTO email_verifications (user_email, verified_at, updated_at) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(user_email) DO UPDATE SET verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
    ).bind(claimed.email).run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
