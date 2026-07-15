import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { isApiResponse, requireAdminApiUser, writeAdminAudit } from "@/lib/admin";
import { enforceRateLimit, errorResponse, normalizeEmail, readJsonObject, RequestError, requireSameOrigin } from "@/lib/security";

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
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
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
