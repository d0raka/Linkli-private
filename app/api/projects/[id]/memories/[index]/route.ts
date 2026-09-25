import { writeMemoryPhoto } from "@/lib/memory-media";
import { errorResponse } from "@/lib/security";
type Context = { params: Promise<{ id: string; index: string }> };
export async function POST(request: Request, context: Context) {
  try { const { id, index } = await context.params; return await writeMemoryPhoto(request, id, index); } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request, context: Context) {
  try { const { id, index } = await context.params; return await writeMemoryPhoto(request, id, index, true); } catch (error) { return errorResponse(error); }
}
