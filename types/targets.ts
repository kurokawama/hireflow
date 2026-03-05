// Target list and profile types — matches Supabase schema

export type PersonaCategory =
  | "trainer_candidate"
  | "competitor_staff"
  | "industry_influencer"
  | "potential_applicant";

export type ProfileSource =
  | "manual"
  | "youtube_search"
  | "x_search"
  | "instagram_hashtag";

export type TargetProfileStatus =
  | "active"
  | "contacted"
  | "applied"
  | "archived";

export interface TargetList {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  brand: string | null;
  keywords: string[];
  platform_filter: string[];
  profile_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TargetProfile {
  id: string;
  org_id: string;
  list_id: string;
  platform: string;
  profile_url: string | null;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  follower_count: number | null;
  interest_tags: string[];
  persona_category: PersonaCategory;
  ai_score: number;
  score_factors: Record<string, unknown>;
  source: ProfileSource;
  notes: string | null;
  status: TargetProfileStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// DTO types for API requests
export interface CreateTargetListRequest {
  name: string;
  description?: string;
  brand?: string;
  keywords?: string[];
  platform_filter?: string[];
}

export interface CreateTargetProfileRequest {
  list_id: string;
  platform: string;
  profile_url?: string;
  username?: string;
  display_name?: string;
  bio?: string;
  follower_count?: number;
  interest_tags?: string[];
  persona_category?: PersonaCategory;
  notes?: string;
  source?: ProfileSource;
}

export interface UpdateTargetProfileRequest {
  display_name?: string;
  bio?: string;
  follower_count?: number;
  interest_tags?: string[];
  persona_category?: PersonaCategory;
  ai_score?: number;
  score_factors?: Record<string, unknown>;
  notes?: string;
  status?: TargetProfileStatus;
}

export interface YouTubeSearchResult {
  channel_id: string;
  channel_title: string;
  description: string;
  thumbnail_url: string;
  subscriber_count: number | null;
  video_count: number | null;
  profile_url: string;
}
