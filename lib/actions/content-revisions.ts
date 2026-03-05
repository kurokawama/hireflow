"use server";

import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";

// Apply an AI revision to the content
export async function applyRevision(
  contentId: string,
  messageId: string
): Promise<{ success: boolean; newVersion: number }> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  // Fetch the message with the revision
  const { data: message, error: msgErr } = await supabase
    .from("conversation_messages")
    .select("revised_body_text, revised_parts_json")
    .eq("id", messageId)
    .single();

  if (msgErr || !message || !message.revised_body_text) {
    throw new Error("Revision not found");
  }

  // Fetch current content
  const { data: content, error: contentErr } = await supabase
    .from("generated_contents")
    .select("id, body_text, parts_json, version, org_id")
    .eq("id", contentId)
    .eq("org_id", authUser.member.org_id)
    .single();

  if (contentErr || !content) {
    throw new Error("Content not found");
  }

  // Log the revision event
  await supabase.from("content_events").insert({
    org_id: authUser.member.org_id,
    content_id: contentId,
    actor_user_id: authUser.userId,
    event: "revision_applied",
    metadata: {
      message_id: messageId,
      old_version: content.version,
      new_version: content.version + 1,
    },
  });

  // Update the content with the revision
  const newVersion = content.version + 1;
  const { error: updateErr } = await supabase
    .from("generated_contents")
    .update({
      body_text: message.revised_body_text,
      parts_json: message.revised_parts_json || content.parts_json,
      version: newVersion,
    })
    .eq("id", contentId);

  if (updateErr) {
    throw new Error("Failed to apply revision");
  }

  return { success: true, newVersion };
}

// Update content status (approve for posting)
export async function approveContent(
  contentId: string
): Promise<{ success: boolean }> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("generated_contents")
    .update({
      status: "approved",
      approved_by: authUser.userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", contentId)
    .eq("org_id", authUser.member.org_id);

  if (error) {
    throw new Error("Failed to approve content");
  }

  // Log the event
  await supabase.from("content_events").insert({
    org_id: authUser.member.org_id,
    content_id: contentId,
    actor_user_id: authUser.userId,
    event: "content_approved",
    metadata: {},
  });

  return { success: true };
}
