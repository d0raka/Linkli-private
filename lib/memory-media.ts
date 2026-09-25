import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { getProductUser } from "@/lib/auth";
import { hasPageAccess } from "@/lib/page-access";
import { canUsePhotos, planFromUserRow } from "@/lib/plans";
import { safeConfig } from "@/lib/templates";
import { enforceRateLimit, RequestError, requireSameOrigin, validSlug, validUuid } from "@/lib/security";

function mediaBucket() {
  if (!env.MEDIA) throw new RequestError(503, "שירות התמונות אינו זמין כרגע. נסו שוב מאוחר יותר.");
  return env.MEDIA;
}

export async function writeMemoryPhoto(request: Request, id: string, index: string, remove = false) {
  requireSameOrigin(request);
  const user = await getProductUser();
  if (!user) throw new RequestError(401, "נדרשת התחברות");
  if (!user.emailVerified) throw new RequestError(403, "יש לאמת את הדוא״ל לפני העלאת תמונות.");
  if (!canUsePhotos(user.plan)) throw new RequestError(403, "תמונות נפתחות במסלול יוצר.", "plan_limit");
  if (!validUuid(id) || !/^[0-5]$/.test(index)) throw new RequestError(404, "השקופית לא נמצאה");
  const db = await ensureDatabase();
  await enforceRateLimit(db, request, "memory-upload", 20, 600, user.email);
  const row = await db.prepare("SELECT * FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
  if (!row) throw new RequestError(404, "העמוד לא נמצא");
  const config = safeConfig(JSON.parse(row.config_json), row.template_id);
  const bucket = mediaBucket();
  if (remove) {
    const key = config.memorySlides?.[Number(index)]?.photoKey;
    if (key?.startsWith(`memories/${id}/`)) await bucket.delete(key);
    return NextResponse.json({ ok: true });
  }
  if (Number(request.headers.get("content-length")) > 408_192) throw new RequestError(413, "התמונה גדולה מדי");
  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || file.size < 32) throw new RequestError(400, "בחרו תמונה");
  if (file.size > 400_000) throw new RequestError(413, "התמונה גדולה מדי");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw new RequestError(400, "אפשר להעלות תמונת JPEG מעובדת בלבד");
  const photoKey = `memories/${id}/${crypto.randomUUID()}.jpg`;
  await bucket.put(photoKey, bytes, { httpMetadata: { contentType: "image/jpeg" } });
  return NextResponse.json({ ok: true, photoKey });
}

export async function readMemoryPhoto(slug: string, key: string) {
  const missing = () => new RequestError(404, "התמונה לא נמצאה");
  if (!validSlug(slug)) throw missing();
  const db = await ensureDatabase();
  const row = await db.prepare(`SELECT projects.*, users.plan, users.plan_tier FROM projects JOIN users ON users.email = projects.owner_email WHERE projects.slug = ?`).bind(slug).first();
  if (!row || !canUsePhotos(planFromUserRow(row)) || !key.startsWith(`memories/${row.id}/`) || !/^memories\/[a-f0-9-]+\/[a-f0-9-]+\.jpg$/.test(key)) throw missing();
  const user = await getProductUser();
  const owner = user?.email === row.owner_email;
  if (!row.published && !owner) throw missing();
  if (row.access_password_hash && !owner && !(await hasPageAccess(slug, row.access_password_hash))) throw missing();
  const config = safeConfig(JSON.parse(row.config_json), row.template_id);
  if (!owner && !config.memorySlides?.some((slide) => slide.photoKey === key)) throw missing();
  const object = await mediaBucket().get(key);
  if (!object) throw missing();
  return new NextResponse(object.body, { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
