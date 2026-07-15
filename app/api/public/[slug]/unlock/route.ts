import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { verifyPassword } from "@/lib/auth";
import { serializePageAccessCookie } from "@/lib/page-access";
import { enforceRateLimit, errorResponse, readJsonObject, RequestError, requireSameOrigin, validSlug } from "@/lib/security";

type Context = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const { slug } = await context.params;
    if (!validSlug(slug)) throw new RequestError(404, "העמוד לא נמצא");
    const body = await readJsonObject(request, 2_048);
    const password = typeof body.password === "string" ? body.password : "";
    if (!password || Array.from(password).length > 64) throw new RequestError(400, "יש להזין את סיסמת העמוד.");
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "page-unlock", 10, 900, slug);
    const project = await db.prepare("SELECT access_password_hash FROM projects WHERE slug = ? AND published = 1").bind(slug).first();
    if (!project?.access_password_hash) throw new RequestError(404, "העמוד אינו מוגן בסיסמה.");
    const valid = await verifyPassword(password, { password_hash: project.access_password_hash });
    if (!valid) throw new RequestError(401, "הסיסמה אינה נכונה. נסו שוב.");
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", await serializePageAccessCookie(slug));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
