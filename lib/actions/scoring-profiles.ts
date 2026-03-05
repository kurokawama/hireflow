"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type { ScoringProfile, ScoringWeights } from "@/types/quiz";
import type {
  CreateScoringProfileRequest,
  UpdateScoringProfileRequest,
} from "@/types/quiz-dto";

export async function getScoringProfile(
  campaignId: string
): Promise<ScoringProfile | null> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("scoring_profiles")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as ScoringProfile;
}

// Get active scoring weights for a campaign (used by quiz submit API)
export async function getScoringWeights(
  campaignId: string
): Promise<ScoringWeights | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("scoring_profiles")
    .select("weights_json")
    .eq("campaign_id", campaignId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.weights_json as ScoringWeights;
}

export async function createScoringProfile(
  input: CreateScoringProfileRequest
): Promise<ScoringProfile> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("scoring_profiles")
    .insert({
      campaign_id: input.campaign_id,
      name: input.name || "default",
      weights_json: input.weights_json,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScoringProfile;
}

export async function updateScoringProfile(
  profileId: string,
  input: UpdateScoringProfileRequest
): Promise<ScoringProfile> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("scoring_profiles")
    .update(input)
    .eq("id", profileId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScoringProfile;
}
