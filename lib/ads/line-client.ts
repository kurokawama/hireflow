// LINE Ads Platform API client — mock-first implementation
// LINE Ads supports: friend-addition ads, survey campaigns, demographic targeting
// Full API integration to be added when LINE Ads Platform API credentials are available

const LINE_ADS_API_BASE = "https://ads.line.me/api/v3.0";

interface LineAdsConfig {
  accessToken: string;
  accountId: string;
}

function getConfig(): LineAdsConfig | null {
  const accessToken = process.env.LINE_ADS_ACCESS_TOKEN;
  const accountId = process.env.LINE_ADS_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    return null;
  }

  return { accessToken, accountId };
}

function isMockMode(): boolean {
  return getConfig() === null;
}

// ============================================================
// Campaign types
// ============================================================

export interface LineAdCampaign {
  id: string;
  name: string;
  objective: "friend_addition" | "website_traffic" | "conversion";
  status: "active" | "paused" | "completed" | "draft";
  daily_budget_jpy: number;
  total_budget_jpy: number | null;
  start_date: string | null;
  end_date: string | null;
}

export interface LineAdPerformance {
  impressions: number;
  clicks: number;
  friend_additions: number;
  spend_jpy: number;
  ctr: number;
  cost_per_friend_jpy: number;
  last_synced_at: string;
}

// ============================================================
// API methods (mock-first)
// ============================================================

/**
 * Create a LINE Ads campaign for friend addition
 */
export async function createFriendAdditionCampaign(params: {
  name: string;
  daily_budget_jpy: number;
  total_budget_jpy?: number;
  targeting?: {
    age_min?: number;
    age_max?: number;
    gender?: "all" | "male" | "female";
    regions?: string[];
    interests?: string[];
  };
}): Promise<LineAdCampaign> {
  if (isMockMode()) {
    // Return mock campaign
    return {
      id: `line_camp_${Date.now()}`,
      name: params.name,
      objective: "friend_addition",
      status: "draft",
      daily_budget_jpy: params.daily_budget_jpy,
      total_budget_jpy: params.total_budget_jpy || null,
      start_date: null,
      end_date: null,
    };
  }

  const config = getConfig()!;

  const response = await fetch(`${LINE_ADS_API_BASE}/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.accessToken}`,
    },
    body: JSON.stringify({
      accountId: config.accountId,
      campaign: {
        campaignName: params.name,
        campaignObjective: "FRIEND_ADD",
        budgetDailyBudget: params.daily_budget_jpy,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`LINE Ads API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.campaignId,
    name: params.name,
    objective: "friend_addition",
    status: "draft",
    daily_budget_jpy: params.daily_budget_jpy,
    total_budget_jpy: params.total_budget_jpy || null,
    start_date: null,
    end_date: null,
  };
}

/**
 * Get campaign performance metrics
 */
export async function getCampaignPerformance(
  campaignId: string
): Promise<LineAdPerformance> {
  if (isMockMode()) {
    return {
      impressions: 0,
      clicks: 0,
      friend_additions: 0,
      spend_jpy: 0,
      ctr: 0,
      cost_per_friend_jpy: 0,
      last_synced_at: new Date().toISOString(),
    };
  }

  const config = getConfig()!;

  const response = await fetch(
    `${LINE_ADS_API_BASE}/stats/campaigns/${campaignId}`,
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`LINE Ads API error: ${response.status}`);
  }

  const data = await response.json();
  const impressions = data.impressions || 0;
  const clicks = data.clicks || 0;
  const friendAdditions = data.friendAdditions || 0;
  const spend = data.cost || 0;

  return {
    impressions,
    clicks,
    friend_additions: friendAdditions,
    spend_jpy: spend,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cost_per_friend_jpy: friendAdditions > 0 ? spend / friendAdditions : 0,
    last_synced_at: new Date().toISOString(),
  };
}

/**
 * List all campaigns
 */
export async function listCampaigns(): Promise<LineAdCampaign[]> {
  if (isMockMode()) {
    return [];
  }

  const config = getConfig()!;

  const response = await fetch(
    `${LINE_ADS_API_BASE}/campaigns?accountId=${config.accountId}`,
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`LINE Ads API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.campaigns || []).map(
    (c: Record<string, unknown>) =>
      ({
        id: c.campaignId,
        name: c.campaignName,
        objective: "friend_addition",
        status: String(c.status || "draft").toLowerCase(),
        daily_budget_jpy: c.budgetDailyBudget || 0,
        total_budget_jpy: null,
        start_date: null,
        end_date: null,
      }) as LineAdCampaign
  );
}
