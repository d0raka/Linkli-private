import { NextResponse } from "next/server";
import { deleteCurrentSession, serializeSessionCookie } from "@/lib/auth";
import { errorResponse, requireSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await deleteCurrentSession();
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", serializeSessionCookie("", 0));
    response.headers.set("Clear-Site-Data", '"cache", "cookies"');
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
