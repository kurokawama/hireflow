"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import { sendMulticast } from "@/lib/line/messaging";
import type { LineCandidate, LineDeliveryLog } from "@/types/line-broadcast";

export async function getLineEnabledCandidates(params?: {
  campaign_id?: string;
  min_score?: number;
  stage?: string;
}): Promise<LineCandidate[]> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  let query = supabase
    .from("candidates")
    .select("id, name, line_user_id, ai_score, stage, created_at")
    .eq("org_id", member.org_id)
    .not("line_user_id", "is", null)
    .order("created_at", { ascending: false });

  if (params?.min_score) {
    query = query.gte("ai_score", params.min_score);
  }

  if (params?.stage) {
    query = query.eq("stage", params.stage);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as LineCandidate[];
}

export async function sendQuizLinkMulticast(input: {
  campaign_id: string;
  line_user_ids: string[];
  message: string;
  include_quiz_url: boolean;
}): Promise<{ success: boolean; sent_count: number; error?: string; delivery_log_id?: string }> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  // Build quiz URL
  let quizUrl: string | null = null;
  if (input.include_quiz_url) {
    const { data: campaign } = await supabase
      .from("quiz_campaigns")
      .select("slug")
      .eq("id", input.campaign_id)
      .single();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "";
    quizUrl = campaign ? `${baseUrl}/quiz/${campaign.slug}?ref=line_blast` : null;
  }

  // Build message
  const messageText = quizUrl
    ? `${input.message}\n\n${quizUrl}`
    : input.message;

  // Send via LINE multicast
  const result = await sendMulticast(input.line_user_ids, [
    { type: "text", text: messageText },
  ]);

  // Log delivery
  const { data: log } = await supabase
    .from("line_delivery_logs")
    .insert({
      org_id: member.org_id,
      campaign_id: input.campaign_id,
      delivery_type: "multicast",
      recipient_count: result.sent_count,
      message_text: messageText,
      quiz_url: quizUrl,
      status: result.success ? "sent" : "failed",
      error_message: result.error || null,
    })
    .select("id")
    .single();

  return {
    success: result.success,
    sent_count: result.sent_count,
    error: result.error,
    delivery_log_id: log?.id,
  };
}

export async function getDeliveryLogs(
  campaignId?: string,
  limit = 10
): Promise<LineDeliveryLog[]> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  let query = supabase
    .from("line_delivery_logs")
    .select("*")
    .eq("org_id", member.org_id)
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const { data } = await query;
  return (data || []) as LineDeliveryLog[];
}
