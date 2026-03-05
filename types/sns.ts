// SNS-related types for platform connections and posting

export type SNSPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "line"
  | "x"
  | "youtube";

export type ConnectionStatus = "active" | "expired" | "revoked";

export type PostingStatus =
  | "pending"
  | "processing"
  | "posted"
  | "failed"
  | "cancelled";

export type PostingLogAction =
  | "attempted"
  | "succeeded"
  | "failed"
  | "retried";

// Phase B — SNS OAuth connection (org-level)
export interface SNSConnection {
  id: string;
  org_id: string;
  platform: SNSPlatform;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  external_account_id: string | null;
  external_account_name: string | null;
  account_metadata: Record<string, unknown>;
  status: ConnectionStatus;
  connected_by: string | null;
  created_at: string;
  updated_at: string;
}

// Phase B — Posting queue
export interface PostingQueue {
  id: string;
  org_id: string;
  content_id: string;
  connection_id: string;
  platform: SNSPlatform;
  scheduled_at: string | null;
  status: PostingStatus;
  external_post_id: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  approved_by: string;
  approved_at: string;
  media_urls: string[];
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Phase B — Posting audit log
export interface PostingLog {
  id: string;
  org_id: string;
  queue_id: string | null;
  content_id: string;
  platform: SNSPlatform;
  action: PostingLogAction;
  external_post_id: string | null;
  response_data: Record<string, unknown>;
  error_details: string | null;
  created_at: string;
}
