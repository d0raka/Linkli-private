export type CampaignAttribution = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};

export type MarketingEventName =
  | "landing_view"
  | "cta_click"
  | "signup"
  | "project_created"
  | "project_published"
  | "checkout_started"
  | "waitlist_joined";

const campaignKeys = {
  source: "utm_source",
  medium: "utm_medium",
  campaign: "utm_campaign",
  content: "utm_content",
  term: "utm_term",
} as const;

function campaignValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120);
}

export function campaignFromObject(value: Record<string, unknown>): CampaignAttribution {
  return {
    source: campaignValue(value.utm_source ?? value.source),
    medium: campaignValue(value.utm_medium ?? value.medium),
    campaign: campaignValue(value.utm_campaign ?? value.campaign),
    content: campaignValue(value.utm_content ?? value.content),
    term: campaignValue(value.utm_term ?? value.term),
  };
}

export function campaignSearchParams(campaign: CampaignAttribution) {
  const params = new URLSearchParams();
  for (const [field, queryKey] of Object.entries(campaignKeys) as Array<[keyof CampaignAttribution, string]>) {
    if (campaign[field]) params.set(queryKey, campaign[field]);
  }
  return params;
}

export function withCampaign(path: string, campaign: CampaignAttribution) {
  const url = new URL(path, "https://linkli.online");
  const campaignParams = campaignSearchParams(campaign);
  campaignParams.forEach((value, key) => url.searchParams.set(key, value));
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function recordMarketingEvent(
  db: any,
  eventName: MarketingEventName,
  options: {
    userEmail?: string | null;
    campaign?: CampaignAttribution;
    templateId?: string | null;
  } = {},
) {
  const campaign = options.campaign || { source: "", medium: "", campaign: "", content: "", term: "" };
  await db.prepare(
    `INSERT INTO marketing_events (
      id, event_name, user_email, campaign_source, campaign_medium, campaign_name,
      campaign_content, campaign_term, template_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    eventName,
    options.userEmail || null,
    campaign.source || null,
    campaign.medium || null,
    campaign.campaign || null,
    campaign.content || null,
    campaign.term || null,
    options.templateId || null,
  ).run();
}

export async function recordMarketingEventSafely(
  db: any,
  eventName: MarketingEventName,
  options: Parameters<typeof recordMarketingEvent>[2] = {},
) {
  try {
    let campaign = options.campaign;
    if (!campaign && options.userEmail) {
      const signup = await db.prepare(
        `SELECT campaign_source, campaign_medium, campaign_name, campaign_content, campaign_term
         FROM marketing_events WHERE event_name = 'signup' AND user_email = ?
         ORDER BY created_at DESC LIMIT 1`,
      ).bind(options.userEmail).first();
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
    await recordMarketingEvent(db, eventName, { ...options, campaign });
  } catch (error) {
    console.error(`Marketing event failed: ${eventName}`, error);
  }
}
