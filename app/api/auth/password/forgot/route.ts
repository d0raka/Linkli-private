import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { actionUrl, issueAuthToken } from "@/lib/account-security";
import { emailDeliveryConfigured, sendAuthEmail } from "@/lib/email";
import { enforceRateLimit, errorResponse, normalizeEmail, readJsonObject, requireSameOrigin } from "@/lib/security";

const GENERIC_MESSAGE = "אם קיים חשבון עם הכתובת שהזנת, תישלח אליו הודעה עם קישור לאיפוס הסיסמה.";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 2_048);
    const email = normalizeEmail(body.email);
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "password-recovery", 4, 3_600, email || "invalid");
    if (process.env.NODE_ENV !== "development" && !emailDeliveryConfigured()) return NextResponse.json({ error: "שירות איפוס הסיסמה אינו זמין כרגע כי שירות הדוא״ל אינו מחובר. נסו שוב מאוחר יותר." }, { status: 503 });
    if (!email) return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    const user = await db.prepare(
      "SELECT users.email, users.display_name FROM users JOIN auth_credentials ON auth_credentials.email = users.email WHERE users.email = ?",
    ).bind(email).first();
    let localResetUrl = "";
    if (user) {
      const token = await issueAuthToken(email, "reset_password", 1_800);
      const resetUrl = actionUrl(request, "/reset-password", token);
      const delivery = await sendAuthEmail({
        to: email,
        displayName: String(user.display_name),
        type: "reset_password",
        actionUrl: resetUrl,
      });
      if (!delivery.sent) {
        console.warn(`Password recovery email was not sent: ${delivery.reason}`);
        const hostname = new URL(request.url).hostname;
        if (process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "::1"].includes(hostname)) {
          localResetUrl = resetUrl;
        }
      }
    }
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE, ...(localResetUrl ? { localResetUrl } : {}) });
  } catch (error) {
    return errorResponse(error);
  }
}
