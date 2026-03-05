// Quiz system DTOs — API request/response shapes

import type { QuestionType, CampaignBrand, QuizQuestionWithOptions } from "./quiz";

// --- Quiz Config API (public, for rendering quiz) ---

export interface QuizConfigResponse {
  campaign_id: string;
  campaign_name: string;
  brand: CampaignBrand;
  questions: QuizQuestionWithOptions[];
}

// --- Quiz Campaign CRUD ---

export interface CreateCampaignRequest {
  name: string;
  slug: string;
  brand: CampaignBrand;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface UpdateCampaignRequest {
  name?: string;
  slug?: string;
  brand?: CampaignBrand;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

// --- Quiz Question CRUD ---

export interface CreateQuestionRequest {
  campaign_id: string;
  question_key: string;
  question_text: string;
  question_type: QuestionType;
  sort_order: number;
  is_required?: boolean;
}

export interface UpdateQuestionRequest {
  question_key?: string;
  question_text?: string;
  question_type?: QuestionType;
  sort_order?: number;
  is_required?: boolean;
}

// --- Quiz Option CRUD ---

export interface CreateOptionRequest {
  question_id: string;
  option_value: string;
  option_label: string;
  sort_order: number;
}

export interface UpdateOptionRequest {
  option_value?: string;
  option_label?: string;
  sort_order?: number;
}

// --- Scoring Profile ---

export interface CreateScoringProfileRequest {
  campaign_id: string;
  name?: string;
  weights_json: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdateScoringProfileRequest {
  name?: string;
  weights_json?: Record<string, unknown>;
  is_active?: boolean;
}

// --- Candidate Lists ---

export interface CreateListRequest {
  name: string;
  brand?: string;
  purpose?: string;
  description?: string;
}

export interface UpdateListRequest {
  name?: string;
  brand?: string;
  purpose?: string;
  description?: string;
  is_active?: boolean;
}
