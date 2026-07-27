import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { campaignFromObject, recordMarketingEvent } from "@/lib/marketing";
import { enforceRateLimit, errorResponse, readJsonObject, requireSameOrigin } from "@/lib/security";

const publicEvents = new Set(["landing_view", "cta_click"]);

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 2_048);
    const eventName = typeof body.event === "string" && publicEvents.has(body.event) ? body.event as "landing_view" | "cta_click" : null;
    if (!eventName) return NextResponse.json({ error: "אירוע לא תקין" }, { status: 400 });
    const templateId = typeof body.templateId === "string" && /^[a-z0-9-]{1,50}$/.test(body.templateId) ? body.templateId : null;
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "marketing-event", 180, 60, undefined, "ip");
    await recordMarketingEvent(db, eventName, { campaign: campaignFromObject(body), templateId });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
