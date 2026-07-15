import { NextResponse } from "next/server";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { actionUrl, issueAuthToken } from "@/lib/account-security";
import { sendAuthEmail } from "@/lib/email";
import { enforceRateLimit, errorResponse, readJsonObject, requireSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await readJsonObject(request, 1_024);
    const user = await getProductUser();
    if (!user) return NextResponse.json({ error: "יש להתחבר לחשבון כדי לשלוח הודעת אימות." }, { status: 401 });
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "email-verification", 3, 3_600, user.email);
    const token = await issueAuthToken(user.email, "verify_email", 86_400);
    const delivery = await sendAuthEmail({
      to: user.email,
      displayName: user.displayName,
      type: "verify_email",
      actionUrl: actionUrl(request, "/verify-email", token),
    });
    if (!delivery.sent) {
      return NextResponse.json({ error: "שירות הודעות הדוא״ל עדיין אינו זמין. אפשר להמשיך לעבוד ולנסות שוב מאוחר יותר." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
