// Quiz system types — matches Supabase schema for v2.5

export type QuestionType = "single_select" | "multi_select" | "text_input";

export type CampaignBrand = "dr_stretch" | "wecle" | "hq";

export interface QuizCampaign {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  brand: CampaignBrand;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  campaign_id: string;
  question_key: string;
  question_text: string;
  question_type: QuestionType;
  sort_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_value: string;
  option_label: string;
  sort_order: number;
  created_at: string;
}

// Question with nested options (for API responses)
export interface QuizQuestionWithOptions extends QuizQuestion {
  quiz_options: QuizOption[];
}

// Campaign with nested questions+options (full config)
export interface QuizCampaignFull extends QuizCampaign {
  quiz_questions: QuizQuestionWithOptions[];
}

// Scoring profile
export interface ScoringWeightValues {
  max_score: number;
  values?: Record<string, number>;
  high_value?: string[];
  per_match?: number;
  base?: number;
  default?: number;
}

export type ScoringWeights = Record<string, ScoringWeightValues>;

export interface ScoringProfile {
  id: string;
  campaign_id: string;
  name: string;
  weights_json: ScoringWeights;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Candidate lists
export interface CandidateList {
  id: string;
  org_id: string;
  name: string;
  brand: string | null;
  purpose: string | null;
  description: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CandidateListMember {
  id: string;
  list_id: string;
  candidate_id: string;
  added_by: string | null;
  notes: string | null;
  added_at: string;
}

// List with member count (for list views)
export interface CandidateListWithCount extends CandidateList {
  member_count: number;
}
