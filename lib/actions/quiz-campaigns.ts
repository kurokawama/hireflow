"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type { QuizCampaign, QuizCampaignFull } from "@/types/quiz";
import type { CreateCampaignRequest, UpdateCampaignRequest } from "@/types/quiz-dto";

export async function getCampaigns(): Promise<QuizCampaign[]> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("quiz_campaigns")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getCampaignWithQuestions(
  campaignId: string
): Promise<QuizCampaignFull | null> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("quiz_campaigns")
    .select(`
      *,
      quiz_questions (
        *,
        quiz_options (*)
      )
    `)
    .eq("id", campaignId)
    .order("sort_order", { referencedTable: "quiz_questions", ascending: true })
    .single();

  if (error) return null;

  // Sort options within each question
  if (data?.quiz_questions) {
    for (const q of data.quiz_questions) {
      if (q.quiz_options) {
        q.quiz_options.sort(
          (a: { sort_order: number }, b: { sort_order: number }) =>
            a.sort_order - b.sort_order
        );
      }
    }
  }

  return data as QuizCampaignFull;
}

export async function createCampaign(
  input: CreateCampaignRequest
): Promise<QuizCampaign> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  // If setting as default, unset other defaults first
  if (input.is_default) {
    await supabase
      .from("quiz_campaigns")
      .update({ is_default: false })
      .eq("org_id", member.org_id)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("quiz_campaigns")
    .insert({
      org_id: member.org_id,
      name: input.name,
      slug: input.slug,
      brand: input.brand,
      description: input.description || null,
      is_active: input.is_active ?? true,
      is_default: input.is_default ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateCampaign(
  campaignId: string,
  input: UpdateCampaignRequest
): Promise<QuizCampaign> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  // If setting as default, unset other defaults first
  if (input.is_default) {
    await supabase
      .from("quiz_campaigns")
      .update({ is_default: false })
      .eq("org_id", member.org_id)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("quiz_campaigns")
    .update(input)
    .eq("id", campaignId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  await requireAuth();
  const supabase = createAdminClient();

  // Prevent deleting default campaign
  const { data: campaign } = await supabase
    .from("quiz_campaigns")
    .select("is_default")
    .eq("id", campaignId)
    .single();

  if (campaign?.is_default) {
    throw new Error("デフォルトキャンペーンは削除できません");
  }

  const { error } = await supabase
    .from("quiz_campaigns")
    .delete()
    .eq("id", campaignId);

  if (error) throw new Error(error.message);
}
