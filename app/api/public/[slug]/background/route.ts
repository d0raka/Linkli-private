import { servePublicMedia } from "@/lib/public-media";
import { errorResponse } from "@/lib/security";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    return await servePublicMedia(slug, "project_backgrounds", "אין רקע");
  } catch (error) {
    return errorResponse(error);
  }
}
