// Entry tracking and funnel types — matches Supabase schema

export type FunnelStep =
  | "impression"
  | "click"
  | "quiz_start"
  | "quiz_complete"
  | "line_follow"
  | "ticket_issued"
  | "ticket_redeemed"
  | "interview_book";

export type EntrySource =
  | "organic_post"
  | "paid_ad"
  | "advocacy_share"
  | "direct";

export interface EntryTracking {
  id: string;
  org_id: string;
  posting_queue_id: string | null;
  candidate_id: string | null;
  entry_source: EntrySource;
  referral_platform: string | null;
  funnel_step: FunnelStep;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LineSettings {
  id: string;
  org_id: string;
  interview_booking_url: string | null;
  welcome_message: string;
  follow_up_messages: FollowUpMessage[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FollowUpMessage {
  delay_hours: number;
  message_text: string;
}

// RPC response type
export interface FunnelMetrics {
  funnel_step: FunnelStep;
  total_count: number;
  by_source: Record<string, number>;
  by_platform: Record<string, number>;
}

// Funnel summary for dashboard
export interface FunnelSummary {
  impression: number;
  click: number;
  quiz_start: number;
  quiz_complete: number;
  line_follow: number;
  ticket_issued: number;
  ticket_redeemed: number;
  interview_book: number;
  conversion_rate: number; // impression → interview_book %
}
