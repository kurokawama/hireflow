// Audience Builder — Converts target list analysis into platform-specific audiences
// Orchestrates: attribute analysis → audience creation on each ad platform

import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeListAttributes } from "@/lib/ai/attribute-analyzer";
import {
  createCustomAudience,
  createLookalikeAudience,
  searchInterests,
} from "@/lib/ads/meta-ads";
import type { AdAudience, AudienceType, AdPlatform } from "@/types/ads";

interface BuildAudienceResult {
  audience: AdAudience;
  analysisId: string;
}

export async function buildAudienceFromList(params: {
  listId: string;
  orgId: string;
  userId: string;
  platform: AdPlatform;
  audienceType: AudienceType;
  name?: string;
}): Promise<BuildAudienceResult> {
  const supabase = createAdminClient();

  // Step 1: Get the list info
  const { data: list } = await supabase
    .from("target_lists")
    .select("id, name, profile_count")
    .eq("id", params.listId)
    .eq("org_id", params.orgId)
    .single();

  if (!list) {
    throw new Error("Target list not found");
  }

  // Step 2: Run AI attribute analysis
  const analysis = await analyzeListAttributes(params.listId, params.orgId);

  // Step 3: Save analysis to DB
  const { data: savedAnalysis, error: analysisError } = await supabase
    .from("attribute_analyses")
    .insert({
      org_id: params.orgId,
      target_list_id: params.listId,
      summary_text: analysis.summary_text,
      targeting_attributes: analysis.targeting_attributes,
      recommended_platforms: analysis.recommended_platforms,
      recommended_daily_budget_jpy: analysis.recommended_daily_budget_jpy,
      strategy_notes: analysis.strategy_notes,
    })
    .select("id")
    .single();

  if (analysisError || !savedAnalysis) {
    throw new Error(`Failed to save analysis: ${analysisError?.message}`);
  }

  // Step 4: Create audience on the target ad platform
  const audienceName =
    params.name || `${list.name} - ${params.audienceType} (${params.platform})`;

  let externalAudienceId: string | null = null;
  let estimatedReach: number | null = null;

  if (params.platform === "meta") {
    try {
      if (params.audienceType === "core") {
        // Core audience: use demographics + interests directly
        // Resolve interest names to Meta interest IDs
        const interestIds: Array<{ id: string; name: string }> = [];
        for (const interest of analysis.targeting_attributes.interests.slice(0, 5)) {
          const results = await searchInterests(interest);
          if (results.length > 0) {
            interestIds.push({ id: results[0].id, name: results[0].name });
            estimatedReach = (estimatedReach || 0) + results[0].audience_size;
          }
        }
        // Core audiences don't need external ID — targeting is inline
        externalAudienceId = null;
      } else if (params.audienceType === "custom") {
        // Custom audience from profile data
        externalAudienceId = await createCustomAudience({
          name: audienceName,
          description: `Auto-generated from list: ${list.name}`,
          subtype: "CUSTOM",
        });
      } else if (params.audienceType === "lookalike") {
        // Need a custom audience first, then create lookalike
        const customId = await createCustomAudience({
          name: `${audienceName} - Seed`,
          description: `Seed audience for lookalike from: ${list.name}`,
          subtype: "CUSTOM",
        });
        externalAudienceId = await createLookalikeAudience({
          name: audienceName,
          sourceAudienceId: customId,
          country: "JP",
          ratio: 0.01, // Top 1% similar
        });
      }
    } catch (error) {
      // Save the audience as "error" status if platform creation fails
      const { data: savedAudience } = await supabase
        .from("ad_audiences")
        .insert({
          org_id: params.orgId,
          name: audienceName,
          audience_type: params.audienceType,
          target_list_id: params.listId,
          platform: params.platform,
          targeting_attributes: analysis.targeting_attributes,
          external_audience_id: null,
          estimated_reach: null,
          status: "error",
          error_message: error instanceof Error ? error.message : "Unknown error",
          created_by: params.userId,
        })
        .select()
        .single();

      return {
        audience: savedAudience as unknown as AdAudience,
        analysisId: savedAnalysis.id,
      };
    }
  }

  // Step 5: Save audience to DB
  const { data: savedAudience, error: audienceError } = await supabase
    .from("ad_audiences")
    .insert({
      org_id: params.orgId,
      name: audienceName,
      audience_type: params.audienceType,
      target_list_id: params.listId,
      platform: params.platform,
      targeting_attributes: analysis.targeting_attributes,
      external_audience_id: externalAudienceId,
      estimated_reach: estimatedReach,
      status: externalAudienceId ? "ready" : "draft",
      created_by: params.userId,
    })
    .select()
    .single();

  if (audienceError || !savedAudience) {
    throw new Error(`Failed to save audience: ${audienceError?.message}`);
  }

  return {
    audience: savedAudience as unknown as AdAudience,
    analysisId: savedAnalysis.id,
  };
}
