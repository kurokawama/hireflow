// Ad campaign and audience types — Full Auto Pipeline

export type AdPlatform = "meta" | "google" | "x" | "line";

export type AdStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "active"
  | "paused"
  | "completed"
  | "failed";

export type AudienceType = "core" | "custom" | "lookalike";

// ============================================================
// Ad Audiences
// ============================================================

export interface AdAudience {
  id: string;
  org_id: string;
  name: string;
  audience_type: AudienceType;
  target_list_id: string | null; // source target list for analysis
  platform: AdPlatform;
  // Targeting attributes (AI-generated from list analysis)
  targeting_attributes: TargetingAttributes;
  // Platform-specific audience ID (after creation)
  external_audience_id: string | null;
  estimated_reach: number | null;
  status: "draft" | "building" | "ready" | "error";
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TargetingAttributes {
  age_min: number | null;
  age_max: number | null;
  locations: string[]; // e.g. ["Tokyo", "Osaka"]
  interests: string[]; // e.g. ["fitness", "personal training"]
  gender: "all" | "male" | "female" | null;
  // AI-generated summary text
  attribute_summary: string; // e.g. "20-30歳、東京圏、フィットネス関心層"
  // Raw analysis data
  analysis_details: {
    total_profiles_analyzed: number;
    age_distribution: Record<string, number>; // e.g. {"20-25": 45, "26-30": 32}
    location_distribution: Record<string, number>;
    interest_distribution: Record<string, number>;
    persona_distribution: Record<string, number>;
  };
}

// ============================================================
// Ad Campaigns
// ============================================================

export interface AdCampaign {
  id: string;
  org_id: string;
  name: string;
  platform: AdPlatform;
  audience_id: string; // reference to ad_audiences
  content_id: string; // reference to generated_contents
  // Budget
  daily_budget_jpy: number;
  total_budget_jpy: number | null;
  // Schedule
  start_date: string | null;
  end_date: string | null;
  // Platform-specific IDs (after deployment)
  external_campaign_id: string | null;
  external_ad_set_id: string | null;
  external_ad_id: string | null;
  // Performance
  performance: AdPerformance | null;
  // Status
  status: AdStatus;
  approved_by: string | null;
  approved_at: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdPerformance {
  impressions: number;
  clicks: number;
  ctr: number; // click-through rate
  cpc_jpy: number; // cost per click
  cpm_jpy: number; // cost per 1000 impressions
  spend_jpy: number;
  conversions: number;
  last_synced_at: string;
}

// ============================================================
// Attribute Analysis (AI-generated)
// ============================================================

export interface AttributeAnalysis {
  id: string;
  org_id: string;
  target_list_id: string;
  // AI-generated targeting text
  summary_text: string; // "20-30歳、東京圏、フィットネス関心層、SNS活用度高"
  targeting_attributes: TargetingAttributes;
  // Recommended ad strategy
  recommended_platforms: AdPlatform[];
  recommended_daily_budget_jpy: number;
  strategy_notes: string; // AI recommendations
  created_at: string;
}

// ============================================================
// DTOs
// ============================================================

export interface CreateAdCampaignRequest {
  name: string;
  platform: AdPlatform;
  audience_id: string;
  content_id: string;
  daily_budget_jpy: number;
  total_budget_jpy?: number;
  start_date?: string;
  end_date?: string;
}

export interface BuildAudienceRequest {
  target_list_id: string;
  platform: AdPlatform;
  audience_type: AudienceType;
  name?: string;
}

export interface DeployAdRequest {
  campaign_id: string;
}

export interface AnalyzeAttributesRequest {
  target_list_id: string;
}
