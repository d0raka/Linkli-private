import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { isApiResponse, requireAdminApiUser, writeAdminAudit } from "@/lib/admin";
import { isAdminEmail } from "@/lib/auth";
import { enforceRateLimit, errorResponse, normalizeEmail, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";
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
    const target = await db.prepare("SELECT email, plan FROM users WHERE email = ?").bind(email).first();
    if (!target) throw new RequestError(404, "המשתמש לא נמצא");

    if (action === "set_plan") {
      const plan = body.plan === "plus" ? "plus" : body.plan === "free" ? "free" : null;
      if (!plan) throw new RequestError(400, "המסלול שנבחר אינו תקין.");
      await db.prepare("UPDATE users SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?").bind(plan, email).run();
      await writeAdminAudit(admin.email, "user.plan_changed", "user", email, { from: target.plan, to: plan });
      return NextResponse.json({ ok: true, plan });
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
    const target = await db.prepare(
      `SELECT users.email, users.plan,
        COUNT(projects.id) AS project_count,
        COALESCE(SUM(CASE WHEN projects.published = 1 THEN 1 ELSE 0 END), 0) AS published_count
       FROM users LEFT JOIN projects ON projects.owner_email = users.email
       WHERE users.email = ? GROUP BY users.email, users.plan`,
    ).bind(email).first();
    if (!target) throw new RequestError(404, "המשתמש לא נמצא");

    await db.batch([
      db.prepare("DELETE FROM auth_tokens WHERE user_email = ?").bind(email),
      db.prepare("DELETE FROM email_verifications WHERE user_email = ?").bind(email),
      db.prepare("DELETE FROM sessions WHERE user_email = ?").bind(email),
      db.prepare("DELETE FROM auth_credentials WHERE email = ?").bind(email),
      db.prepare("DELETE FROM user_controls WHERE email = ?").bind(email),
      db.prepare("DELETE FROM projects WHERE owner_email = ?").bind(email),
      db.prepare("DELETE FROM users WHERE email = ?").bind(email),
    ]);
    await writeAdminAudit(admin.email, "user.deleted", "user", email, {
      plan: target.plan,
      projectCount: Number(target.project_count || 0),
      publishedCount: Number(target.published_count || 0),
    });
    return NextResponse.json({
      ok: true,
      deleted: {
        email,
        plan: target.plan,
        projectCount: Number(target.project_count || 0),
        publishedCount: Number(target.published_count || 0),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
