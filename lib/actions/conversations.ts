"use server";

import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContentConversation, ConversationMessage } from "@/types/conversation";

// Get or create a conversation for a content item
export async function getOrCreateConversation(
  contentId: string
): Promise<ContentConversation> {
  const authUser = await requireAuth();
  const supabase = createAdminClient();

  // Check content exists and user has access
  const { data: content, error: contentErr } = await supabase
    .from("generated_contents")
    .select("id, org_id")
    .eq("id", contentId)
    .eq("org_id", authUser.member.org_id)
    .single();

  if (contentErr || !content) {
    throw new Error("Content not found");
  }

  // Try to get existing conversation
  const { data: existing } = await supabase
    .from("content_conversations")
    .select("*")
    .eq("content_id", contentId)
    .single();

  if (existing) {
    return existing as ContentConversation;
  }

  // Create new conversation
  const { data: conversation, error: createErr } = await supabase
    .from("content_conversations")
    .insert({
      org_id: authUser.member.org_id,
      content_id: contentId,
      status: "active",
    })
    .select()
    .single();

  if (createErr || !conversation) {
    throw new Error("Failed to create conversation");
  }

  return conversation as ContentConversation;
}

// Get all messages for a conversation
export async function getMessages(
  conversationId: string
): Promise<ConversationMessage[]> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data: messages, error } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Failed to fetch messages");
  }

  return (messages || []) as ConversationMessage[];
}

// Save a human message to the conversation
export async function saveHumanMessage(
  conversationId: string,
  content: string
): Promise<ConversationMessage> {
  const authUser = await requireAuth();
  const supabase = createAdminClient();

  const { data: message, error } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversationId,
      role: "human",
      content,
      actor_user_id: authUser.userId,
      metadata: {},
    })
    .select()
    .single();

  if (error || !message) {
    throw new Error("Failed to save message");
  }

  return message as ConversationMessage;
}

// Save an AI response message to the conversation
export async function saveAIMessage(
  conversationId: string,
  content: string,
  revisedBodyText?: string,
  revisedPartsJson?: Record<string, unknown>
): Promise<ConversationMessage> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data: message, error } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversationId,
      role: "ai",
      content,
      revised_body_text: revisedBodyText || null,
      revised_parts_json: revisedPartsJson || null,
      metadata: {},
    })
    .select()
    .single();

  if (error || !message) {
    throw new Error("Failed to save AI message");
  }

  return message as ConversationMessage;
}
