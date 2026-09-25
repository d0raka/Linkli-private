import { servePublicMedia } from "@/lib/public-media";
import { errorResponse } from "@/lib/security";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    return await servePublicMedia(slug, "project_emoji_images", "אין תמונה");
  } catch (error) {
    return errorResponse(error);
  }
}
