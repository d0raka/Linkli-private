import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { actionUrl, issueAuthToken } from "@/lib/account-security";
import { sendAuthEmail } from "@/lib/email";
import { enforceRateLimit, errorResponse, normalizeEmail, readJsonObject, requireSameOrigin } from "@/lib/security";

const GENERIC_MESSAGE = "אם קיים חשבון עם הכתובת שהזנת, תישלח אליו הודעה עם קישור לאיפוס הסיסמה.";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 2_048);
    const email = normalizeEmail(body.email);
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "password-recovery", 4, 3_600, email || "invalid");
    if (!email) return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    const user = await db.prepare(
      "SELECT users.email, users.display_name FROM users JOIN auth_credentials ON auth_credentials.email = users.email WHERE users.email = ?",
    ).bind(email).first();
    if (user) {
      const token = await issueAuthToken(email, "reset_password", 1_800);
      await sendAuthEmail({
        to: email,
        displayName: String(user.display_name),
        type: "reset_password",
        actionUrl: actionUrl(request, "/reset-password", token),
      });
    }
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  } catch (error) {
    return errorResponse(error);
  }
}
