// Data Transfer Objects — API request/response shapes

import type {
  TemplateType,
  Platform,
  Channel,
  CandidateStage,
  ContentStatus,
  RoleType,
} from "./database";

// --- Content Generation ---

export interface GenerateRequest {
  store_id: string;
  profile_id: string;
  template_type: TemplateType;
  platforms: Platform[];
}

export interface GeneratedPlatformContent {
  content_id: string;
  platform: Platform;
  body_text: string;
  parts_json: Record<string, unknown>;
  apply_link: string;
}

export interface GenerateResponse {
  contents: GeneratedPlatformContent[];
  generation_request_id: string;
}

// --- Quiz ---

export interface QuizSubmitRequest {
  campaign_id?: string;
  answers?: Record<string, unknown>;
  // Legacy fields (backward compat)
  sports_exp?: "current" | "past" | "injury_break" | "spectator" | "none";
  interests?: string[];
  area?: string;
  age_range?: "18-22" | "23-27" | "28-32" | "33+";
  start_timing?: "immediately" | "1-3months" | "exploring";
  name?: string;
  email?: string;
  line_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface QuizResultResponse {
  candidate_id: string;
  matched_store: {
    id: string;
    store_name: string;
    brand: string;
    location_text: string;
  };
  score: number;
  apply_url: string;
  line_friend_url: string;
}

// --- Analytics ---

export interface DashboardKPI {
  period: string;
  generations: number;
  ad_impressions: number;
  clicks: number;
  quiz_completions: number;
  applications: number;
  hires: number;
  cost_per_hire: number;
  channel_breakdown: {
    channel: Channel;
    clicks: number;
    applications: number;
    cost: number;
  }[];
}

export interface PipelineStage {
  stage: CandidateStage;
  count: number;
}

// --- Content Library ---

export interface ContentListItem {
  id: string;
  store_name: string;
  brand: string;
  platform: Platform;
  channel: Channel;
  template_type: TemplateType;
  status: ContentStatus;
  body_text: string;
  click_count: number;
  created_at: string;
  approved_at: string | null;
}

// --- Members ---

export interface CreateMemberRequest {
  email: string;
  password: string;
  display_name: string;
  role: RoleType;
  store_id?: string;
}

// --- Conversations ---

export type {
  SendMessageRequest,
  AIConversationResponse,
  ApplyRevisionRequest,
  ConversationResponse,
} from "./conversation";

// --- Trainer Portal ---

export interface TrainerContentItem {
  id: string;
  platform: Platform;
  body_text: string;
  parts_json: Record<string, unknown>;
  apply_link_code: string;
  store_name: string;
  created_at: string;
}
