import { NextResponse } from "next/server";
import { createSession, safeReturnTo, serializeSessionCookie, verifyPassword } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { enforceRateLimit, errorResponse, normalizeEmail, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  let stage = "request";
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 8_192);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password || Array.from(password).length > 128) {
      return NextResponse.json({ error: "כתובת הדוא״ל או הסיסמה שגויות" }, { status: 401 });
    }
    stage = "database";
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "auth-login-account", 8, 900, email, "subject");
    await enforceRateLimit(db, request, "auth-login-ip", 30, 900, undefined, "ip");
    stage = "credential";
    const credential = await db.prepare(
      "SELECT password_hash, password_salt, password_iterations FROM auth_credentials WHERE email = ?",
    ).bind(email).first();
    stage = "password";
    if (!(await verifyPassword(password, credential))) {
      return NextResponse.json({ error: "כתובת הדוא״ל או הסיסמה שגויות" }, { status: 401 });
    }
    const control = await db.prepare("SELECT status FROM user_controls WHERE email = ?").bind(email).first();
    if (control?.status === "suspended") {
      return NextResponse.json({ error: "החשבון אינו פעיל. אפשר לפנות לתמיכה." }, { status: 403 });
    }
    stage = "session";
    const token = await createSession(email);
    const returnTo = safeReturnTo(body.returnTo);
    const verification = await db.prepare(
      "SELECT verified_at FROM email_verifications WHERE user_email = ?",
    ).bind(email).first();
    const requiresVerification = Boolean(verification && !verification.verified_at);
    const redirectTo = requiresVerification
      ? `/verify-email?returnTo=${encodeURIComponent(returnTo)}`
      : returnTo;
    const response = NextResponse.json({ ok: true, redirectTo, requiresVerification });
    response.headers.set("Set-Cookie", serializeSessionCookie(token));
    return response;
  } catch (error) {
    if (!(error instanceof RequestError)) {
      console.error(`Login failed at ${stage}`, error);
      return NextResponse.json({ error: "אירעה שגיאה. נסו שוב בעוד רגע.", reference: `LOGIN-${stage.toUpperCase()}` }, { status: 500 });
    }
    return errorResponse(error);
  }
}
