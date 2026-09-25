import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { getProductUser } from "@/lib/auth";
import { isPaidPlan } from "@/lib/plans";
import { enforceRateLimit, RequestError, requireSameOrigin, validUuid } from "@/lib/security";

export type MediaUploadOptions = {
  table: "project_backgrounds" | "project_emoji_images";
  maxBytes: number;
  rateLimitBucket: string;
  verifyMessage: string;
};

/** Multipart bodies allow a little framing overhead on top of the image itself. */
const MULTIPART_OVERHEAD_BYTES = 8_192;

function isJpeg(bytes: Uint8Array) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/**
 * Shared upload pipeline: authentication, plan, declared size, rate limit and ownership are all
 * checked before the multipart body is parsed, so oversized or foreign uploads never cost a parse.
 */
export async function handleMediaUpload(request: Request, context: { params: Promise<{ id: string }> }, options: MediaUploadOptions) {
  requireSameOrigin(request);
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  if (!user.emailVerified) return NextResponse.json({ error: options.verifyMessage }, { status: 403 });
  if (!isPaidPlan(user.plan)) {
    return NextResponse.json({ error: "העלאת תמונות כלולה במסלול Pro ומעלה", code: "plan_limit", feature: "photos" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!validUuid(id)) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes + MULTIPART_OVERHEAD_BYTES) throw new RequestError(413, "התמונה גדולה מדי");

  const db = await ensureDatabase();
  await enforceRateLimit(db, request, options.rateLimitBucket, 12, 600, user.email);
  const current = await db.prepare("SELECT id FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
  if (!current) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 32) throw new RequestError(400, "בחרו תמונה להעלאה");
  if (file.size > options.maxBytes) throw new RequestError(413, "התמונה גדולה מדי");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) throw new RequestError(400, "אפשר להעלות רק תמונת JPEG מעובדת");

  const existing = await db.prepare(`SELECT object_key FROM ${options.table} WHERE project_id = ?`).bind(id).first();
  const objectKey = `${options.table}/${id}/${crypto.randomUUID()}.jpg`;
  if (env.MEDIA) {
    if (typeof existing?.object_key === "string" && existing.object_key.startsWith(`${options.table}/${id}/`)) {
      await env.MEDIA.delete(existing.object_key);
    }
    await env.MEDIA.put(objectKey, bytes, { httpMetadata: { contentType: "image/jpeg" } });
    await db.prepare(`INSERT OR REPLACE INTO ${options.table} (project_id, mime, data, object_key, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(id, "image/jpeg", new Uint8Array(), objectKey)
      .run();
  } else {
    await db.prepare(`INSERT OR REPLACE INTO ${options.table} (project_id, mime, data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(id, "image/jpeg", bytes)
      .run();
  }
  return NextResponse.json({ ok: true, version: Date.now() });
}

export async function handleMediaDelete(request: Request, context: { params: Promise<{ id: string }> }, options: Pick<MediaUploadOptions, "table" | "rateLimitBucket" | "verifyMessage">) {
  requireSameOrigin(request);
  const user = await getProductUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  if (!user.emailVerified) return NextResponse.json({ error: options.verifyMessage }, { status: 403 });
  const { id } = await context.params;
  if (!validUuid(id)) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
  const db = await ensureDatabase();
  await enforceRateLimit(db, request, options.rateLimitBucket, 20, 600, user.email);
  const existing = await db.prepare(`SELECT object_key FROM ${options.table} WHERE project_id IN (SELECT id FROM projects WHERE id = ? AND owner_email = ?)`).bind(id, user.email).first();
  if (env.MEDIA && typeof existing?.object_key === "string") await env.MEDIA.delete(existing.object_key);
  const result = await db.prepare(`DELETE FROM ${options.table} WHERE project_id IN (SELECT id FROM projects WHERE id = ? AND owner_email = ?)`).bind(id, user.email).run();
  const owned = await db.prepare("SELECT id FROM projects WHERE id = ? AND owner_email = ?").bind(id, user.email).first();
  if (!owned) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
  return NextResponse.json({ ok: true, removed: Number(result.meta?.changes || 0) });
}
