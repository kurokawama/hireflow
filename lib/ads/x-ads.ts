// X (Twitter) Ads API client — Promoted tweets and campaign management
// Requires X Ads API access (included with X API Basic $200/month)

const X_ADS_API_BASE = "https://ads-api.twitter.com/12";

interface XAdsConfig {
  bearerToken: string;
  adAccountId: string;
}

function getConfig(): XAdsConfig {
  const bearerToken = process.env.X_API_BEARER_TOKEN;
  const adAccountId = process.env.X_AD_ACCOUNT_ID;

  if (!bearerToken || !adAccountId) {
    throw new Error(
      "X Ads API is not configured. Set X_API_BEARER_TOKEN and X_AD_ACCOUNT_ID in environment variables."
    );
  }

  return { bearerToken, adAccountId };
}

async function xAdsFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getConfig();
  const url = `${X_ADS_API_BASE}/accounts/${config.adAccountId}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.bearerToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`X Ads API error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================
// Campaign Creation
// ============================================================

interface XAdsCampaignResult {
  campaignId: string;
  lineItemId: string;
}

export async function createXAdCampaign(params: {
  name: string;
  dailyBudgetCents: number; // Budget in cents (micro-currency)
  startTime?: string; // ISO date
  endTime?: string;
  targeting: {
    locations?: string[]; // Country/region codes
    ageRanges?: string[]; // AGE_13_TO_24, AGE_25_TO_34, etc.
    interests?: string[]; // Interest IDs
    keywords?: string[]; // Keyword targeting
    followerLookalikes?: string[]; // Target users similar to followers of these accounts
  };
  tweetId?: string; // Existing tweet to promote
}): Promise<XAdsCampaignResult> {
  // Step 1: Create Campaign
  const campaignResult = await xAdsFetch<{
    data: { id: string };
  }>("/campaigns", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      funding_instrument_id: "auto", // Use default funding
      daily_budget_amount_local_micro: params.dailyBudgetCents * 10000, // Convert to micro
      start_time: params.startTime,
      end_time: params.endTime,
      entity_status: "PAUSED",
    }),
  });

  const campaignId = campaignResult.data.id;

  // Step 2: Create Line Item (Ad Group equivalent)
  const targeting: Record<string, unknown> = {};

  if (params.targeting.locations?.length) {
    targeting.locations = params.targeting.locations;
  }
  if (params.targeting.interests?.length) {
    targeting.interests = params.targeting.interests;
  }
  if (params.targeting.keywords?.length) {
    targeting.keywords = params.targeting.keywords;
  }
  if (params.targeting.followerLookalikes?.length) {
    targeting.follower_lookalikes = params.targeting.followerLookalikes;
  }

  const lineItemResult = await xAdsFetch<{
    data: { id: string };
  }>("/line_items", {
    method: "POST",
    body: JSON.stringify({
      campaign_id: campaignId,
      name: `${params.name} - Line Item`,
      product_type: "PROMOTED_TWEETS",
      placements: ["ALL_ON_TWITTER"],
      objective: "AWARENESS",
      bid_type: "AUTO",
      entity_status: "PAUSED",
      targeting_criteria: targeting,
    }),
  });

  const lineItemId = lineItemResult.data.id;

  // Step 3: Promote tweet if provided
  if (params.tweetId) {
    await xAdsFetch("/promoted_tweets", {
      method: "POST",
      body: JSON.stringify({
        line_item_id: lineItemId,
        tweet_ids: [params.tweetId],
      }),
    });
  }

  return { campaignId, lineItemId };
}

// ============================================================
// Campaign Management
// ============================================================

export async function activateXCampaign(campaignId: string): Promise<void> {
  await xAdsFetch(`/campaigns/${campaignId}`, {
    method: "PUT",
    body: JSON.stringify({ entity_status: "ACTIVE" }),
  });
}

export async function pauseXCampaign(campaignId: string): Promise<void> {
  await xAdsFetch(`/campaigns/${campaignId}`, {
    method: "PUT",
    body: JSON.stringify({ entity_status: "PAUSED" }),
  });
}

export async function getXCampaignStats(
  campaignId: string
): Promise<{
  impressions: number;
  clicks: number;
  engagements: number;
  spend_micro: number;
}> {
  const result = await xAdsFetch<{
    data: Array<{
      id_data: Array<{ metrics: { impressions: string[]; clicks: string[]; engagements: string[]; billed_charge_local_micro: string[] } }>;
    }>;
  }>(`/stats/campaigns/${campaignId}?metric_groups=ENGAGEMENT,BILLING`);

  const metrics = result.data?.[0]?.id_data?.[0]?.metrics;
  return {
    impressions: parseInt(metrics?.impressions?.[0] || "0"),
    clicks: parseInt(metrics?.clicks?.[0] || "0"),
    engagements: parseInt(metrics?.engagements?.[0] || "0"),
    spend_micro: parseInt(metrics?.billed_charge_local_micro?.[0] || "0"),
  };
}
