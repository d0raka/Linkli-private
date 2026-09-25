import { readMemoryPhoto } from "@/lib/memory-media";
import { errorResponse } from "@/lib/security";
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try { const { slug } = await context.params; return await readMemoryPhoto(slug, new URL(request.url).searchParams.get("key") || ""); } catch (error) { return errorResponse(error); }
}
