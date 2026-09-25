import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { getProductUser } from "@/lib/auth";
import { hasPageAccess } from "@/lib/page-access";
import { canUsePhotos, planFromUserRow } from "@/lib/plans";
import { validSlug } from "@/lib/security";

export type PublicMediaTable = "project_backgrounds" | "project_emoji_images";

function asBytes(value: unknown) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

/**
 * Serves an uploaded page image. Unpublished pages are visible to their owner only; password
 * protected pages additionally require the unlock cookie (the owner is always allowed so the
 * Studio preview keeps working). Protected media is never cacheable.
 */
export async function servePublicMedia(slug: string, table: PublicMediaTable, missingMessage: string) {
  const notFound = (message: string) => NextResponse.json({ error: message }, { status: 404 });
  if (!validSlug(slug)) return notFound("העמוד לא נמצא");
  const db = await ensureDatabase();
  const project = await db.prepare(
    `SELECT projects.id, projects.owner_email, projects.published, projects.access_password_hash, users.plan, users.plan_tier
     FROM projects JOIN users ON users.email = projects.owner_email
     WHERE projects.slug = ?`,
  ).bind(slug).first();
  if (!project) return notFound("העמוד לא נמצא");

  const locked = typeof project.access_password_hash === "string" && project.access_password_hash.length > 0;
  let ownerViewing = false;
  if (!project.published || locked) {
    const user = await getProductUser();
    ownerViewing = Boolean(user && user.email === project.owner_email);
  }
  if (!project.published && !ownerViewing) return notFound("העמוד לא נמצא");
  if (locked && !ownerViewing && !(await hasPageAccess(slug, String(project.access_password_hash)))) return notFound("העמוד לא נמצא");
  if (!canUsePhotos(planFromUserRow(project))) return notFound(missingMessage);

  const row = await db.prepare(`SELECT mime, data, object_key FROM ${table} WHERE project_id = ?`).bind(project.id).first();
  let bytes = row ? asBytes(row.data) : null;
  if (row && typeof row.object_key === "string" && env.MEDIA) {
    const object = await env.MEDIA.get(row.object_key);
    const stored = object?.body;
    bytes = stored instanceof Uint8Array ? stored : stored ? asBytes(stored) : bytes;
    if (stored && !(stored instanceof Uint8Array) && typeof stored === "object" && "getReader" in stored) {
      bytes = new Uint8Array(await new Response(stored as ReadableStream).arrayBuffer());
    }
  }
  if (!row || !bytes || bytes.byteLength < 4) return notFound(missingMessage);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": typeof row.mime === "string" ? row.mime : "image/jpeg",
      "cache-control": locked || !project.published ? "private, no-store" : "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
