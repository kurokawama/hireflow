// Meta Marketing API client — Facebook & Instagram ad campaign management
// Handles: Custom Audiences, Lookalike Audiences, Campaign creation, Ad deployment

const META_API_VERSION = "v21.0";
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaApiConfig {
  appId: string;
  appSecret: string;
  accessToken: string;
  adAccountId: string;
}

function getConfig(): MetaApiConfig {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!appId || !appSecret || !accessToken || !adAccountId) {
    throw new Error(
      "Meta Ads API is not configured. Set META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN, META_AD_ACCOUNT_ID in environment variables."
    );
  }

  return { appId, appSecret, accessToken, adAccountId };
}

async function metaFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getConfig();
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${META_API_BASE}${endpoint}${separator}access_token=${config.accessToken}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as Record<string, unknown>;
    const errorMsg =
      (error.error as Record<string, unknown>)?.message ?? response.statusText;
    throw new Error(`Meta API error (${response.status}): ${String(errorMsg)}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================
// Custom Audiences
// ============================================================

interface CreateCustomAudienceParams {
  name: string;
  description: string;
  subtype: "CUSTOM" | "LOOKALIKE";
}

interface CustomAudienceResponse {
  id: string;
}

export async function createCustomAudience(
  params: CreateCustomAudienceParams
): Promise<string> {
  const config = getConfig();
  const result = await metaFetch<CustomAudienceResponse>(
    `/act_${config.adAccountId}/customaudiences`,
    {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        description: params.description,
        subtype: params.subtype,
        customer_file_source: "USER_PROVIDED_ONLY",
      }),
    }
  );
  return result.id;
}

// Upload hashed emails/phones to custom audience
export async function addUsersToCustomAudience(
  audienceId: string,
  data: { emails?: string[]; phones?: string[] }
): Promise<void> {
  const schema: string[] = [];
  const dataRows: string[][] = [];

  if (data.emails?.length) {
    schema.push("EMAIL");
    // Meta requires SHA-256 hashed, lowercase, trimmed emails
    for (const email of data.emails) {
      const hash = await hashSHA256(email.trim().toLowerCase());
      dataRows.push([hash]);
    }
  }

  if (data.phones?.length) {
    schema.push("PHONE");
    for (const phone of data.phones) {
      const normalized = phone.replace(/[^0-9+]/g, "");
      const hash = await hashSHA256(normalized);
      dataRows.push([hash]);
    }
  }

  if (dataRows.length === 0) return;

  await metaFetch(`/${audienceId}/users`, {
    method: "POST",
    body: JSON.stringify({
      payload: {
        schema,
        data: dataRows,
      },
    }),
  });
}

// ============================================================
// Lookalike Audiences
// ============================================================

export async function createLookalikeAudience(params: {
  name: string;
  sourceAudienceId: string;
  country: string; // ISO country code e.g. "JP"
  ratio: number; // 0.01 = top 1% similar
}): Promise<string> {
  const config = getConfig();
  const result = await metaFetch<CustomAudienceResponse>(
    `/act_${config.adAccountId}/customaudiences`,
    {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        subtype: "LOOKALIKE",
        origin_audience_id: params.sourceAudienceId,
        lookalike_spec: JSON.stringify({
          type: "similarity",
          country: params.country,
          ratio: params.ratio,
        }),
      }),
    }
  );
  return result.id;
}

// ============================================================
// Core Audience Targeting (demographics + interests)
// ============================================================

interface CoreTargeting {
  age_min?: number;
  age_max?: number;
  genders?: number[]; // 1=male, 2=female
  geo_locations?: {
    countries?: string[];
    regions?: Array<{ key: string }>;
    cities?: Array<{ key: string; radius: number; distance_unit: string }>;
  };
  interests?: Array<{ id: string; name: string }>;
  behaviors?: Array<{ id: string; name: string }>;
}

// Search for interest IDs (needed for targeting)
export async function searchInterests(
  query: string
): Promise<Array<{ id: string; name: string; audience_size: number }>> {
  const result = await metaFetch<{
    data: Array<{ id: string; name: string; audience_size_lower_bound: number }>;
  }>(`/search?type=adinterest&q=${encodeURIComponent(query)}`);

  return (result.data || []).map((item) => ({
    id: item.id,
    name: item.name,
    audience_size: item.audience_size_lower_bound,
  }));
}

// ============================================================
// Campaign Creation
// ============================================================

interface CreateCampaignResult {
  campaignId: string;
  adSetId: string;
  adId: string;
}

export async function createFullCampaign(params: {
  name: string;
  dailyBudgetCents: number; // Budget in cents (e.g., ¥5000 = 500000)
  startTime?: string; // ISO date
  endTime?: string;
  targeting: CoreTargeting;
  audienceId?: string; // Custom or Lookalike audience ID
  adCreative: {
    pageId: string; // Facebook Page ID
    message: string;
    linkUrl?: string;
    imageUrl?: string;
  };
}): Promise<CreateCampaignResult> {
  const config = getConfig();

  // Step 1: Create Campaign
  const campaign = await metaFetch<{ id: string }>(
    `/act_${config.adAccountId}/campaigns`,
    {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        objective: "OUTCOME_AWARENESS",
        status: "PAUSED", // Start paused, activate after approval
        special_ad_categories: ["EMPLOYMENT"], // Required for recruitment ads
      }),
    }
  );

  // Step 2: Create Ad Set with targeting
  const targetingSpec: Record<string, unknown> = {
    ...params.targeting,
  };

  // If we have a custom/lookalike audience, add it to targeting
  if (params.audienceId) {
    targetingSpec.custom_audiences = [{ id: params.audienceId }];
  }

  const adSet = await metaFetch<{ id: string }>(
    `/act_${config.adAccountId}/adsets`,
    {
      method: "POST",
      body: JSON.stringify({
        name: `${params.name} - Ad Set`,
        campaign_id: campaign.id,
        daily_budget: params.dailyBudgetCents,
        billing_event: "IMPRESSIONS",
        optimization_goal: "REACH",
        targeting: targetingSpec,
        start_time: params.startTime,
        end_time: params.endTime,
        status: "PAUSED",
      }),
    }
  );

  // Step 3: Create Ad Creative
  const creativeData: Record<string, unknown> = {
    name: `${params.name} - Creative`,
    object_story_spec: {
      page_id: params.adCreative.pageId,
      link_data: {
        message: params.adCreative.message,
        link: params.adCreative.linkUrl || `https://www.dr-stretch.com/`,
        image_url: params.adCreative.imageUrl,
      },
    },
  };

  const creative = await metaFetch<{ id: string }>(
    `/act_${config.adAccountId}/adcreatives`,
    {
      method: "POST",
      body: JSON.stringify(creativeData),
    }
  );

  // Step 4: Create Ad
  const ad = await metaFetch<{ id: string }>(
    `/act_${config.adAccountId}/ads`,
    {
      method: "POST",
      body: JSON.stringify({
        name: `${params.name} - Ad`,
        adset_id: adSet.id,
        creative: { creative_id: creative.id },
        status: "PAUSED",
      }),
    }
  );

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    adId: ad.id,
  };
}

// ============================================================
// Campaign Management
// ============================================================

export async function activateCampaign(campaignId: string): Promise<void> {
  await metaFetch(`/${campaignId}`, {
    method: "POST",
    body: JSON.stringify({ status: "ACTIVE" }),
  });
}

export async function pauseCampaign(campaignId: string): Promise<void> {
  await metaFetch(`/${campaignId}`, {
    method: "POST",
    body: JSON.stringify({ status: "PAUSED" }),
  });
}

export async function getCampaignInsights(
  campaignId: string
): Promise<{
  impressions: number;
  clicks: number;
  spend: string;
  ctr: string;
  cpc: string;
  cpm: string;
}> {
  const result = await metaFetch<{
    data: Array<{
      impressions: string;
      clicks: string;
      spend: string;
      ctr: string;
      cpc: string;
      cpm: string;
    }>;
  }>(`/${campaignId}/insights?fields=impressions,clicks,spend,ctr,cpc,cpm`);

  const data = result.data?.[0];
  if (!data) {
    return {
      impressions: 0,
      clicks: 0,
      spend: "0",
      ctr: "0",
      cpc: "0",
      cpm: "0",
    };
  }

  return {
    impressions: parseInt(data.impressions || "0"),
    clicks: parseInt(data.clicks || "0"),
    spend: data.spend || "0",
    ctr: data.ctr || "0",
    cpc: data.cpc || "0",
    cpm: data.cpm || "0",
  };
}

// ============================================================
// Utility
// ============================================================

async function hashSHA256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
