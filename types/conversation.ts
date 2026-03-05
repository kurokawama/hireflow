// Conversation board types — AI-HR interactive content editing

export type ConversationStatus = "active" | "resolved";

export type MessageRole = "human" | "ai";

export interface ContentConversation {
  id: string;
  org_id: string;
  content_id: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  revised_body_text: string | null;
  revised_parts_json: Record<string, unknown> | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// DTO for sending a message via API
export interface SendMessageRequest {
  message: string;
}

// DTO for AI response (parsed from Claude API)
export interface AIConversationResponse {
  message: string;
  revised_body_text?: string;
  revised_parts_json?: Record<string, unknown>;
}

// DTO for applying a revision
export interface ApplyRevisionRequest {
  message_id: string;
}

// API response for conversation
export interface ConversationResponse {
  conversation: ContentConversation;
  messages: ConversationMessage[];
}
