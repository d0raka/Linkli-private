import { NextResponse } from "next/server";
import { getAdminUser, verifyPassword, type ProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { enforceRateLimit, RequestError } from "@/lib/security";

export async function requireAdminApiUser(): Promise<ProductUser | NextResponse> {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "אין הרשאת מנהל" }, { status: 403 });
  return user;
}

/**
 * Destructive admin actions (plan changes, suspension, deletion, unpublishing) must be confirmed
 * with the admin's own password so a hijacked or forgotten session cannot be used to damage accounts.
 */
export async function requireAdminReauth(db: any, request: Request, admin: ProductUser, body: Record<string, unknown>) {
  const password = typeof body.currentPassword === "string" ? body.currentPassword : "";
  if (!password) throw new RequestError(403, "לביצוע הפעולה יש לאשר את הסיסמה שלך.", "reauth_required");
  await enforceRateLimit(db, request, "admin-reauth", 10, 900, admin.email);
  const credential = await db.prepare(
    "SELECT password_hash, password_salt, password_iterations FROM auth_credentials WHERE email = ?",
  ).bind(admin.email).first();
  if (!(await verifyPassword(password, credential))) throw new RequestError(403, "הסיסמה אינה נכונה.", "reauth_required");
}

export function isApiResponse(value: ProductUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export async function writeAdminAudit(
  adminEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>,
) {
  const db = await ensureDatabase();
  await db.prepare(
    "INSERT INTO admin_audit_log (id, admin_email, action, target_type, target_id, details_json) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), adminEmail, action, targetType, targetId, details ? JSON.stringify(details) : null).run();
}
