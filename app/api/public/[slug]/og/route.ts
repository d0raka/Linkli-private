import { readFileSync } from "node:fs";
import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { validSlug } from "@/lib/security";

async function marketingJpeg(request: Request) {
  if (env.ASSETS) {
    const asset = await env.ASSETS.fetch(new URL("/og-marketing.jpg", request.url));
    if (asset.ok) return new Uint8Array(await asset.arrayBuffer());
  }
  return new Uint8Array(readFileSync(new URL("../../../../../public/og-marketing.jpg", import.meta.url)));
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!validSlug(slug)) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
  const db = await ensureDatabase();
  const project = await db.prepare("SELECT published, access_password_hash FROM projects WHERE slug = ?").bind(slug).first();
  if (!project || !project.published) return NextResponse.json({ error: "העמוד לא נמצא" }, { status: 404 });
  const bytes = await marketingJpeg(request);
  const locked = typeof project.access_password_hash === "string" && project.access_password_hash.length > 0;
  return new NextResponse(bytes, {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": locked ? "private, no-store" : "public, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
