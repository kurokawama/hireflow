// Google Ads API client — YouTube video ad campaign management
// Requires Google Ads API developer token and OAuth credentials

const GOOGLE_ADS_API_VERSION = "v18";
const GOOGLE_ADS_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

interface GoogleAdsConfig {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string; // Google Ads customer ID (without dashes)
}

function getConfig(): GoogleAdsConfig {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    throw new Error(
      "Google Ads API is not configured. Set GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID in environment variables."
    );
  }

  return { developerToken, clientId, clientSecret, refreshToken, customerId };
}

// Refresh OAuth access token
async function getAccessToken(): Promise<string> {
  const config = getConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token refresh failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function googleAdsFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getConfig();
  const accessToken = await getAccessToken();
  const customerId = config.customerId.replace(/-/g, "");

  const url = `${GOOGLE_ADS_BASE}/customers/${customerId}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": config.developerToken,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Ads API error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================
// Campaign Creation (YouTube Video Ads)
// ============================================================

interface GoogleAdsCampaignResult {
  campaignResourceName: string;
  adGroupResourceName: string;
}

export async function createYouTubeAdCampaign(params: {
  name: string;
  dailyBudgetMicros: number; // Budget in micros (¥5000 = 5000000000)
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
  targeting: {
    ageRanges?: string[]; // AGE_RANGE_18_24, AGE_RANGE_25_34, etc.
    genders?: string[]; // MALE, FEMALE
    locations?: string[]; // Geo target criterion IDs
    interests?: string[]; // Affinity/custom intent audience IDs
  };
  videoId?: string; // YouTube video ID for ad creative
}): Promise<GoogleAdsCampaignResult> {
  // Step 1: Create campaign budget
  const budgetResult = await googleAdsFetch<{
    results: Array<{ resourceName: string }>;
  }>("/campaignBudgets:mutate", {
    method: "POST",
    body: JSON.stringify({
      operations: [
        {
          create: {
            name: `${params.name} Budget`,
            amountMicros: String(params.dailyBudgetMicros),
            deliveryMethod: "STANDARD",
          },
        },
      ],
    }),
  });

  const budgetResourceName = budgetResult.results[0].resourceName;

  // Step 2: Create video campaign
  const campaignResult = await googleAdsFetch<{
    results: Array<{ resourceName: string }>;
  }>("/campaigns:mutate", {
    method: "POST",
    body: JSON.stringify({
      operations: [
        {
          create: {
            name: params.name,
            advertisingChannelType: "VIDEO",
            status: "PAUSED",
            campaignBudget: budgetResourceName,
            startDate: params.startDate?.replace(/-/g, "") || undefined,
            endDate: params.endDate?.replace(/-/g, "") || undefined,
            biddingStrategyType: "TARGET_CPM",
          },
        },
      ],
    }),
  });

  const campaignResourceName = campaignResult.results[0].resourceName;

  // Step 3: Create ad group
  const adGroupResult = await googleAdsFetch<{
    results: Array<{ resourceName: string }>;
  }>("/adGroups:mutate", {
    method: "POST",
    body: JSON.stringify({
      operations: [
        {
          create: {
            name: `${params.name} Ad Group`,
            campaign: campaignResourceName,
            type: "VIDEO_TRUE_VIEW_IN_STREAM",
            status: "ENABLED",
            cpmBidMicros: "10000000", // ¥10 CPM default
          },
        },
      ],
    }),
  });

  const adGroupResourceName = adGroupResult.results[0].resourceName;

  // Step 4: Add targeting criteria
  const criterionOps: Array<Record<string, unknown>> = [];

  if (params.targeting.ageRanges) {
    for (const ageRange of params.targeting.ageRanges) {
      criterionOps.push({
        create: {
          adGroup: adGroupResourceName,
          ageRange: { type: ageRange },
        },
      });
    }
  }

  if (params.targeting.locations) {
    for (const locationId of params.targeting.locations) {
      criterionOps.push({
        create: {
          campaign: campaignResourceName,
          location: {
            geoTargetConstant: `geoTargetConstants/${locationId}`,
          },
        },
      });
    }
  }

  if (criterionOps.length > 0) {
    await googleAdsFetch("/campaignCriteria:mutate", {
      method: "POST",
      body: JSON.stringify({ operations: criterionOps }),
    });
  }

  return {
    campaignResourceName,
    adGroupResourceName,
  };
}

// ============================================================
// Campaign Management
// ============================================================

export async function activateGoogleCampaign(
  campaignResourceName: string
): Promise<void> {
  await googleAdsFetch("/campaigns:mutate", {
    method: "POST",
    body: JSON.stringify({
      operations: [
        {
          update: {
            resourceName: campaignResourceName,
            status: "ENABLED",
          },
          updateMask: "status",
        },
      ],
    }),
  });
}

export async function pauseGoogleCampaign(
  campaignResourceName: string
): Promise<void> {
  await googleAdsFetch("/campaigns:mutate", {
    method: "POST",
    body: JSON.stringify({
      operations: [
        {
          update: {
            resourceName: campaignResourceName,
            status: "PAUSED",
          },
          updateMask: "status",
        },
      ],
    }),
  });
}

export async function getGoogleCampaignMetrics(
  campaignResourceName: string
): Promise<{
  impressions: number;
  clicks: number;
  costMicros: number;
  videoViews: number;
}> {
  const result = await googleAdsFetch<{
    results?: Array<{
      metrics: {
        impressions: string;
        clicks: string;
        costMicros: string;
        videoViews: string;
      };
    }>;
  }>("/googleAds:searchStream", {
    method: "POST",
    body: JSON.stringify({
      query: `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.video_views
        FROM campaign
        WHERE campaign.resource_name = '${campaignResourceName}'
      `,
    }),
  });

  const metrics = result.results?.[0]?.metrics;
  return {
    impressions: parseInt(metrics?.impressions || "0"),
    clicks: parseInt(metrics?.clicks || "0"),
    costMicros: parseInt(metrics?.costMicros || "0"),
    videoViews: parseInt(metrics?.videoViews || "0"),
  };
}
