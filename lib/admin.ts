import { NextResponse } from "next/server";
import { getAdminUser, type ProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";

export async function requireAdminApiUser(): Promise<ProductUser | NextResponse> {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "אין הרשאת מנהל" }, { status: 403 });
  return user;
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
