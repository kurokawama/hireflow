"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type { GiftSettings, GiftCodeStats, GiftDistributionWithDetails } from "@/types/gifts";
import { sendMessage } from "@/lib/line/messaging";

export async function getGiftSettings(
  campaignId?: string
): Promise<GiftSettings | null> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  let query = supabase
    .from("gift_settings")
    .select("*")
    .eq("org_id", member.org_id);

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  } else {
    query = query.is("campaign_id", null);
  }

  const { data } = await query.single();
  return data || null;
}

export async function upsertGiftSettings(input: {
  campaign_id?: string;
  gift_type: string;
  auto_distribute: boolean;
  score_threshold: number | null;
  is_active: boolean;
}): Promise<{ data?: GiftSettings; error?: string }> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("gift_settings")
    .upsert(
      {
        org_id: member.org_id,
        campaign_id: input.campaign_id || null,
        gift_type: input.gift_type,
        auto_distribute: input.auto_distribute,
        score_threshold: input.score_threshold,
        is_active: input.is_active,
      },
      { onConflict: "org_id,campaign_id" }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getGiftCodeStats(
  campaignId?: string
): Promise<GiftCodeStats> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  let query = supabase
    .from("gift_codes")
    .select("status")
    .eq("org_id", member.org_id);

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const { data } = await query;
  const codes = data || [];

  return {
    total: codes.length,
    available: codes.filter((c) => c.status === "available").length,
    distributed: codes.filter((c) => c.status === "distributed").length,
    expired: codes.filter((c) => c.status === "expired").length,
  };
}

export async function importGiftCodes(input: {
  campaign_id?: string;
  codes: { code: string; gift_type: string; amount_yen: number | null }[];
}): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of input.codes) {
    const { error } = await supabase.from("gift_codes").insert({
      org_id: member.org_id,
      campaign_id: input.campaign_id || null,
      gift_type: item.gift_type || "amazon",
      code: item.code,
      amount_yen: item.amount_yen,
      status: "available",
    });

    if (error) {
      if (error.code === "23505") {
        skipped++;
      } else {
        errors.push(`${item.code}: ${error.message}`);
      }
    } else {
      imported++;
    }
  }

  return { imported, skipped, errors };
}

// Distribute gift to a candidate (atomic operation)
export async function distributeGiftToCandidate(
  candidateId: string,
  campaignId?: string
): Promise<{ distributed: boolean; gift_code?: string; reason?: string }> {
  const supabase = createAdminClient();

  // Get org from candidate
  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, name, org_id, line_user_id, ai_score")
    .eq("id", candidateId)
    .single();

  if (!candidate) return { distributed: false, reason: "Candidate not found" };

  // Check gift settings
  let settingsQuery = supabase
    .from("gift_settings")
    .select("*")
    .eq("org_id", candidate.org_id)
    .eq("is_active", true);

  if (campaignId) {
    settingsQuery = settingsQuery.eq("campaign_id", campaignId);
  }

  const { data: settings } = await settingsQuery.single();
  if (!settings) return { distributed: false, reason: "Gift distribution not active" };

  // Check score threshold
  if (settings.score_threshold && candidate.ai_score) {
    if (candidate.ai_score < settings.score_threshold) {
      return { distributed: false, reason: "Score below threshold" };
    }
  }

  // Check if already distributed
  const { data: existing } = await supabase
    .from("gift_distributions")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("campaign_id", campaignId || "")
    .single();

  if (existing) return { distributed: false, reason: "Already distributed" };

  // Get available gift code
  const { data: giftCode } = await supabase
    .from("gift_codes")
    .select("*")
    .eq("org_id", candidate.org_id)
    .eq("status", "available")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!giftCode) return { distributed: false, reason: "No gift codes available" };

  // Mark code as distributed
  await supabase
    .from("gift_codes")
    .update({ status: "distributed" })
    .eq("id", giftCode.id);

  // Record distribution
  let lineSent = false;
  if (candidate.line_user_id) {
    const giftLabel = giftCode.gift_type === "amazon" ? "Amazonギフトカード" : "LINEギフト";
    const amountText = giftCode.amount_yen ? `${giftCode.amount_yen}円分の` : "";
    const result = await sendMessage(candidate.line_user_id, [
      {
        type: "text",
        text: `アンケートへのご回答ありがとうございます！\n${amountText}${giftLabel}をお送りします。\n\nコード: ${giftCode.code}`,
      },
    ]);
    lineSent = result.success;
  }

  await supabase.from("gift_distributions").insert({
    org_id: candidate.org_id,
    gift_code_id: giftCode.id,
    candidate_id: candidateId,
    campaign_id: campaignId || null,
    distributed_via: candidate.line_user_id ? "line" : "manual",
    line_sent: lineSent,
  });

  return { distributed: true, gift_code: giftCode.code };
}

export async function getDistributionHistory(
  campaignId?: string,
  limit = 20
): Promise<GiftDistributionWithDetails[]> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  let query = supabase
    .from("gift_distributions")
    .select(`
      *,
      gift_code:gift_codes(id, code, gift_type, amount_yen),
      candidate:candidates(id, name, line_user_id)
    `)
    .eq("org_id", member.org_id)
    .order("distributed_at", { ascending: false })
    .limit(limit);

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const { data } = await query;
  return (data as unknown as GiftDistributionWithDetails[]) || [];
}
