import { after, NextResponse } from "next/server";
import { deleteCurrentSession, serializeSessionCookie } from "@/lib/auth";
import { errorResponse, requireSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    after(deleteCurrentSession);
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", serializeSessionCookie("", 0));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
