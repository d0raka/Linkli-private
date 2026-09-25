import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { deleteOwnedAccount } from "@/lib/account-security";
import { isApiResponse, requireAdminApiUser, requireAdminReauth, writeAdminAudit } from "@/lib/admin";
import { isAdminEmail } from "@/lib/auth";
import { enforceRateLimit, errorResponse, normalizeEmail, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";
import { persistPlan, parseAdminPlan, planFromUserRow } from "@/lib/plans";
import { plainText } from "@/lib/text";

type Context = { params: Promise<{ email: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const admin = await requireAdminApiUser();
    if (isApiResponse(admin)) return admin;
    const email = normalizeEmail((await context.params).email);
    if (!email) throw new RequestError(404, "המשתמש לא נמצא");
    const body = await readJsonObject(request, 4_096);
    const action = typeof body.action === "string" ? body.action : "";
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "admin-user", 60, 60, admin.email);
    const target = await db.prepare("SELECT email, plan, plan_tier FROM users WHERE email = ?").bind(email).first();
    if (!target) throw new RequestError(404, "המשתמש לא נמצא");
    await requireAdminReauth(db, request, admin, body);

    if (action === "set_plan") {
      const plan = parseAdminPlan(body.plan);
      if (!plan) throw new RequestError(400, "המסלול שנבחר אינו תקין.");
      try {
        await persistPlan(db, email, plan);
      } catch {
        throw new RequestError(500, "לא הצלחנו לעדכן את המסלול.");
      }
      const saved = await db.prepare("SELECT plan, plan_tier FROM users WHERE email = ?").bind(email).first();
      const persisted = planFromUserRow(saved);
      if (persisted !== plan) throw new RequestError(500, "המסלול לא נשמר כמו שנבחר.");
      await writeAdminAudit(admin.email, "user.plan_changed", "user", email, { from: planFromUserRow(target), to: persisted });
      return NextResponse.json({ ok: true, plan: persisted });
    }

    if (action === "suspend" || action === "restore") {
      if (email === admin.email && action === "suspend") throw new RequestError(400, "אי אפשר להשעות את חשבון המנהל שלך");
      const status = action === "suspend" ? "suspended" : "active";
      const note = plainText(body.note, 300);
      await db.prepare(
        `INSERT INTO user_controls (email, status, note, updated_by) VALUES (?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET status = excluded.status, note = excluded.note,
         updated_at = CURRENT_TIMESTAMP, updated_by = excluded.updated_by`,
      ).bind(email, status, note || null, admin.email).run();
      if (status === "suspended") await db.prepare("DELETE FROM sessions WHERE user_email = ?").bind(email).run();
      await writeAdminAudit(admin.email, `user.${status}`, "user", email, { note: note || null });
      return NextResponse.json({ ok: true, status });
    }

    throw new RequestError(400, "פעולה לא תקינה");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const admin = await requireAdminApiUser();
    if (isApiResponse(admin)) return admin;
    const email = normalizeEmail((await context.params).email);
    if (!email) throw new RequestError(404, "המשתמש לא נמצא");
    if (isAdminEmail(email)) throw new RequestError(400, "אי אפשר למחוק חשבון מנהל.");
    const body = await readJsonObject(request, 1_024);
    if (normalizeEmail(body.confirmation) !== email) {
      throw new RequestError(400, "כתובת הדוא״ל לאימות המחיקה אינה תואמת.");
    }

    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "admin-user-delete", 10, 900, admin.email);
    await requireAdminReauth(db, request, admin, body);
    const deleted = await deleteOwnedAccount(email);
    if (!deleted) throw new RequestError(404, "המשתמש לא נמצא");
    await writeAdminAudit(admin.email, "user.deleted", "user", email, {
      plan: deleted.plan,
      projectCount: deleted.projectCount,
      publishedCount: deleted.publishedCount,
    });
    return NextResponse.json({
      ok: true,
      deleted: {
        email: deleted.email,
        plan: deleted.plan,
        projectCount: deleted.projectCount,
        publishedCount: deleted.publishedCount,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
