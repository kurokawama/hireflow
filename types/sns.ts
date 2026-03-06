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

// Phase C-2 — Extended types for UI display

export interface PostingQueueWithContent extends PostingQueue {
  content?: {
    id: string;
    body_text: string;
    platform: string;
    status: string;
  };
  connection?: {
    id: string;
    platform: SNSPlatform;
    external_account_name: string | null;
  };
}

export interface SNSPostRequest {
  content_id: string;
  connection_id: string;
  platform: SNSPlatform;
  scheduled_at?: string; // ISO8601 or null for immediate
  media_urls?: string[];
}

export interface SNSPostResult {
  success: boolean;
  external_post_id?: string;
  error?: string;
  response_data?: Record<string, unknown>;
}

// OAuth config per platform
export interface OAuthConfig {
  platform: SNSPlatform;
  client_id: string;
  client_secret: string;
  authorize_url: string;
  token_url: string;
  scopes: string[];
  redirect_uri: string;
}

// Platform capabilities
export interface PlatformCapability {
  platform: SNSPlatform;
  display_name: string;
  icon: string;
  supports_scheduling: boolean;
  supports_media: boolean;
  max_text_length: number;
  requires_oauth: boolean;
  api_available: boolean; // false = mock only
}
