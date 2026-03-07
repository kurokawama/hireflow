export type LineDeliveryType = "multicast" | "broadcast" | "push";
export type LineDeliveryStatus = "sent" | "failed";

export interface LineDeliveryLog {
  id: string;
  org_id: string;
  campaign_id: string | null;
  delivery_type: LineDeliveryType;
  recipient_count: number;
  message_text: string;
  quiz_url: string | null;
  status: LineDeliveryStatus;
  error_message: string | null;
  sent_at: string;
}

export interface MulticastRequest {
  campaign_id: string;
  line_user_ids: string[];
  message: string;
  include_quiz_url: boolean;
}

export interface LineCandidate {
  id: string;
  name: string;
  line_user_id: string;
  ai_score: number | null;
  stage: string;
  created_at: string;
}
