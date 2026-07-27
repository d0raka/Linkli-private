import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";
import { campaignFromObject, recordMarketingEvent, type CampaignAttribution } from "@/lib/marketing";
import { enforceRateLimit, errorResponse, normalizeEmail, readJsonObject, requireSameOrigin } from "@/lib/security";
import { plainText } from "@/lib/text";

const useCases = new Set(["events", "birthdays", "couples", "creators", "business", "other"]);

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJsonObject(request, 4_096);
    if (typeof body.company === "string" && body.company) return NextResponse.json({ ok: true });
    const email = normalizeEmail(body.email);
    const name = plainText(body.name, 80, true);
    const useCase = typeof body.useCase === "string" && useCases.has(body.useCase) ? body.useCase : "other";
    if (!email || name.length < 2 || body.contactConsent !== true) {
      return NextResponse.json({ error: "יש למלא שם, דוא״ל ולאשר שנוכל ליצור קשר" }, { status: 400 });
    }
    const db = await ensureDatabase();
    await enforceRateLimit(db, request, "marketing-waitlist", 5, 3_600, email);
    let campaign: CampaignAttribution = campaignFromObject(body);
    if (!campaign.source && !campaign.campaign) {
      const signup = await db.prepare(
        `SELECT campaign_source, campaign_medium, campaign_name, campaign_content, campaign_term
         FROM marketing_events WHERE event_name = 'signup' AND user_email = ?
         ORDER BY created_at DESC LIMIT 1`,
      ).bind(email).first();
      if (signup) {
        campaign = {
          source: String(signup.campaign_source || ""),
          medium: String(signup.campaign_medium || ""),
          campaign: String(signup.campaign_name || ""),
          content: String(signup.campaign_content || ""),
          term: String(signup.campaign_term || ""),
        };
      }
    }
    await db.prepare(
      `INSERT INTO marketing_leads (
        email, name, use_case, campaign_source, campaign_medium, campaign_name, campaign_content, campaign_term
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        use_case = excluded.use_case,
        campaign_source = COALESCE(excluded.campaign_source, marketing_leads.campaign_source),
        campaign_medium = COALESCE(excluded.campaign_medium, marketing_leads.campaign_medium),
        campaign_name = COALESCE(excluded.campaign_name, marketing_leads.campaign_name),
        campaign_content = COALESCE(excluded.campaign_content, marketing_leads.campaign_content),
        campaign_term = COALESCE(excluded.campaign_term, marketing_leads.campaign_term),
        updated_at = CURRENT_TIMESTAMP`,
    ).bind(
      email,
      name,
      useCase,
      campaign.source || null,
      campaign.medium || null,
      campaign.campaign || null,
      campaign.content || null,
      campaign.term || null,
    ).run();
    await recordMarketingEvent(db, "waitlist_joined", { userEmail: email, campaign });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
