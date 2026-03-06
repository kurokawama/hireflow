"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type { LineSettings, FollowUpMessage } from "@/types/tracking";

// Get LINE settings for the org
export async function getLineSettings(): Promise<LineSettings | null> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("line_settings")
    .select("*")
    .eq("org_id", authUser.member.org_id)
    .single();

  if (error) return null;
  return data;
}

// Create or update LINE settings
export async function upsertLineSettings(params: {
  interview_booking_url?: string;
  welcome_message?: string;
  follow_up_messages?: FollowUpMessage[];
  is_active?: boolean;
}): Promise<LineSettings | null> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  // Check if settings exist
  const { data: existing } = await supabase
    .from("line_settings")
    .select("id")
    .eq("org_id", authUser.member.org_id)
    .single();

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from("line_settings")
      .update({
        interview_booking_url: params.interview_booking_url,
        welcome_message: params.welcome_message || "ご登録ありがとうございます！面接のご予約はこちらから。",
        follow_up_messages: params.follow_up_messages || [],
        is_active: params.is_active ?? true,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating LINE settings:", error);
      return null;
    }
    return data;
  } else {
    // Create
    const { data, error } = await supabase
      .from("line_settings")
      .insert({
        org_id: authUser.member.org_id,
        interview_booking_url: params.interview_booking_url || null,
        welcome_message: params.welcome_message || "ご登録ありがとうございます！面接のご予約はこちらから。",
        follow_up_messages: params.follow_up_messages || [],
        is_active: params.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating LINE settings:", error);
      return null;
    }
    return data;
  }
}
