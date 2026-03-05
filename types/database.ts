// Database types — matches Supabase schema exactly

export type RoleType = "admin" | "hq_staff" | "store_manager" | "trainer";

export type ContentStatus = "draft" | "review" | "approved" | "posted" | "rejected";

export type TemplateType = "staff_day" | "job_intro" | "qa";

export type Platform = "instagram" | "tiktok" | "line" | "meta_ad" | "google_jobs";

export type Channel = "organic" | "meta_ad" | "line" | "google" | "direct";

export type CandidateStage =
  | "quiz_completed"
  | "line_followed"
  | "contacted"
  | "applied"
  | "interviewed"
  | "hired"
  | "rejected";

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  auth_user_id: string;
  role: RoleType;
  display_name: string;
  email: string;
  store_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  org_id: string;
  store_name: string;
  brand: "dr_stretch" | "wecle";
  location_text: string;
  memo: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  org_id: string;
  profile_name: string;
  brand_name: string;
  values: string;
  tone: string;
  must_include: string[];
  ng_words: string[];
  compliance_note: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffVoice {
  id: string;
  org_id: string;
  store_id: string;
  speaker_name: string;
  content_raw: string;
  highlights: string[];
  consent_status: "pending" | "approved" | "revoked";
  consented_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptTemplate {
  id: string;
  org_id: string;
  template_type: TemplateType;
  platform: Platform;
  system_prompt: string;
  developer_prompt: string;
  user_prompt_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GenerationRequest {
  id: string;
  org_id: string;
  store_id: string;
  profile_id: string;
  template_type: TemplateType;
  platforms: Platform[];
  requested_by: string;
  input_snapshot: Record<string, unknown>;
  status: "pending" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
}

export interface GeneratedContent {
  id: string;
  org_id: string;
  generation_request_id: string;
  store_id: string;
  platform: Platform;
  channel: Channel;
  template_type: TemplateType;
  body_text: string;
  parts_json: Record<string, unknown>;
  status: ContentStatus;
  version: number;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplyLink {
  id: string;
  org_id: string;
  content_id: string;
  store_id: string;
  code: string;
  target_url: string;
  channel: Channel;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  click_count: number;
  created_at: string;
}

export interface ContentEvent {
  id: string;
  org_id: string;
  content_id: string;
  actor_user_id: string | null;
  event: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

export interface Candidate {
  id: string;
  org_id: string;
  store_id: string | null;
  campaign_id: string | null;
  source_channel: Channel;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  line_user_id: string | null;
  quiz_answers: Record<string, unknown>;
  ai_score: number;
  score_factors: Record<string, unknown>;
  matched_store_id: string | null;
  stage: CandidateStage;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateEvent {
  id: string;
  org_id: string;
  candidate_id: string;
  actor_user_id: string | null;
  event: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

// Re-export quiz types for convenience
export type {
  QuizCampaign,
  QuizQuestion,
  QuizOption,
  ScoringProfile,
  CandidateList,
  CandidateListMember,
} from "./quiz";

export interface TrainerPost {
  id: string;
  org_id: string;
  store_id: string;
  trainer_id: string;
  content_id: string;
  platform: Platform;
  posted_at: string;
}
