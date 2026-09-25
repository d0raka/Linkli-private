import { handleMediaDelete, handleMediaUpload } from "@/lib/media-upload";
import { errorResponse } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };

const MAX_BYTES = 220_000;

export async function POST(request: Request, context: Context) {
  try {
    return await handleMediaUpload(request, context, {
      table: "project_emoji_images",
      maxBytes: MAX_BYTES,
      rateLimitBucket: "project-emoji",
      verifyMessage: "יש לאמת את כתובת הדוא״ל לפני העלאת סמל.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    return await handleMediaDelete(request, context, {
      table: "project_emoji_images",
      rateLimitBucket: "project-emoji-delete",
      verifyMessage: "יש לאמת את כתובת הדוא״ל לפני עריכת סמל.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
