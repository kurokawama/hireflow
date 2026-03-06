// AI video editing types — matches Supabase schema

export type AIEditProvider = "runway";

export type AIEditStatus = "pending" | "processing" | "completed" | "failed";

export interface AIEditJob {
  id: string;
  org_id: string;
  video_project_id: string;
  provider: AIEditProvider;
  input_config: AIEditInputConfig;
  output_media_id: string | null;
  cost_usd: number | null;
  status: AIEditStatus;
  error_message: string | null;
  processing_time_seconds: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIEditInputConfig {
  style?: string; // e.g., "cinematic", "professional", "energetic"
  prompt?: string; // AI editing instruction
  duration?: number; // target output duration
  resolution?: string; // "1080p", "720p"
  effects?: string[]; // ["color_grade", "stabilize", "transitions"]
}

// Runway ML specific types
export interface RunwayJobRequest {
  input_video_url: string;
  prompt: string;
  style?: string;
  duration?: number;
}

export interface RunwayJobResponse {
  job_id: string;
  status: string;
  output_url?: string;
  estimated_time_seconds?: number;
}
