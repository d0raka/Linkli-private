import { handleMediaDelete, handleMediaUpload } from "@/lib/media-upload";
import { errorResponse } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };

const MAX_BYTES = 400_000;

export async function POST(request: Request, context: Context) {
  try {
    return await handleMediaUpload(request, context, {
      table: "project_backgrounds",
      maxBytes: MAX_BYTES,
      rateLimitBucket: "project-background",
      verifyMessage: "יש לאמת את כתובת הדוא״ל לפני העלאת רקע.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    return await handleMediaDelete(request, context, {
      table: "project_backgrounds",
      rateLimitBucket: "project-background-delete",
      verifyMessage: "יש לאמת את כתובת הדוא״ל לפני עריכת רקע.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
