import { NextResponse } from "next/server";
import { ensureUserRecord, getProductUser } from "@/app/chatgpt-auth";
import { ensureDatabase } from "@/db";
import { projectFromRow } from "@/lib/projects";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  const profile = await ensureUserRecord(user) as any;
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { published?: boolean };
  const db = await ensureDatabase();
  const current = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
  if (!current) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
  const shouldPublish = body.published !== false;
  if (shouldPublish && !current.published) {
    const count = await db.prepare("SELECT COUNT(*) AS total FROM projects WHERE owner_email = ? AND published = 1").bind(user.email).first();
    const limit = profile.plan === "plus" ? 10 : 1;
    if (Number(count.total) >= limit) return NextResponse.json({ error: `התוכנית שלך מאפשרת עד ${limit} עמודים מפורסמים` }, { status: 403 });
  }
  await db.prepare("UPDATE projects SET published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_email = ?")
    .bind(shouldPublish ? 1 : 0, id, user.email).run();
  const row = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  return NextResponse.json({ project: projectFromRow(row) });
}
