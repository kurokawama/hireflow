// Automated batch collection pipeline
// Runs multiple keyword searches → AI scoring → auto-registration

import { createAdminClient } from "@/lib/supabase/admin";
import { searchYouTubeChannels } from "@/lib/youtube/search";
import {
  scoreProfiles,
  youtubeResultToProfileInput,
} from "@/lib/ai/profile-scorer";
import type {
  CollectionCriteria,
  CollectionResult,
  YouTubeSearchResult,
} from "@/types/targets";

interface BatchCollectOptions {
  listId: string;
  orgId: string;
  userId: string;
  criteria: CollectionCriteria;
}

export async function runBatchCollection(
  options: BatchCollectOptions
): Promise<CollectionResult> {
  const { listId, orgId, userId, criteria } = options;
  const supabase = createAdminClient();

  const result: CollectionResult = {
    profiles_found: 0,
    profiles_added: 0,
    profiles_skipped: 0,
    profiles_duplicate: 0,
    errors: [],
  };

  // Step 1: Run YouTube searches for all keywords
  const allChannels: YouTubeSearchResult[] = [];
  const seenChannelIds = new Set<string>();

  for (const keyword of criteria.keywords) {
    try {
      const channels = await searchYouTubeChannels(
        keyword,
        orgId,
        criteria.max_results_per_keyword
      );
      for (const ch of channels) {
        if (!seenChannelIds.has(ch.channel_id)) {
          seenChannelIds.add(ch.channel_id);
          allChannels.push(ch);
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : `Search failed: ${keyword}`;
      result.errors.push(msg);
    }
  }

  result.profiles_found = allChannels.length;

  if (allChannels.length === 0) {
    return result;
  }

  // Step 2: Check for duplicates already in the list
  const { data: existing } = await supabase
    .from("target_profiles")
    .select("profile_url")
    .eq("list_id", listId)
    .eq("org_id", orgId);

  const existingUrls = new Set(
    (existing || []).map((p: { profile_url: string | null }) => p.profile_url)
  );

  const newChannels = allChannels.filter((ch) => {
    if (existingUrls.has(ch.profile_url)) {
      result.profiles_duplicate++;
      return false;
    }
    return true;
  });

  if (newChannels.length === 0) {
    return result;
  }

  // Step 3: AI scoring
  const profileInputs = newChannels.map(youtubeResultToProfileInput);
  let scores;
  try {
    scores = await scoreProfiles(profileInputs, criteria);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "AI scoring failed";
    result.errors.push(msg);
    return result;
  }

  // Step 4: Filter by criteria and auto-register
  const profilesToInsert: Array<Record<string, unknown>> = [];

  for (let i = 0; i < newChannels.length; i++) {
    const channel = newChannels[i];
    const score = scores[i];

    // Filter by score threshold
    if (score.score < criteria.score_threshold) {
      result.profiles_skipped++;
      continue;
    }

    // Filter by age range (if estimated and criteria specified)
    if (criteria.age_min && score.estimated_age_max !== null) {
      if (score.estimated_age_max < criteria.age_min) {
        result.profiles_skipped++;
        continue;
      }
    }
    if (criteria.age_max && score.estimated_age_min !== null) {
      if (score.estimated_age_min > criteria.age_max) {
        result.profiles_skipped++;
        continue;
      }
    }

    // Filter by location (if specified and estimated)
    if (
      criteria.location &&
      score.estimated_location &&
      !score.estimated_location.includes(criteria.location)
    ) {
      result.profiles_skipped++;
      continue;
    }

    profilesToInsert.push({
      org_id: orgId,
      list_id: listId,
      platform: "youtube",
      profile_url: channel.profile_url,
      username: channel.channel_id,
      display_name: channel.channel_title,
      bio: channel.description || null,
      follower_count: channel.subscriber_count,
      interest_tags: score.interest_tags,
      persona_category: score.persona_category,
      ai_score: score.score,
      score_factors: score.score_factors,
      source: "youtube_search",
      notes: score.reasoning,
      status: "active",
      created_by: userId,
    });
  }

  if (profilesToInsert.length === 0) {
    return result;
  }

  // Step 5: Bulk insert
  const { error: insertError } = await supabase
    .from("target_profiles")
    .insert(profilesToInsert);

  if (insertError) {
    result.errors.push(`Bulk insert failed: ${insertError.message}`);
    return result;
  }

  result.profiles_added = profilesToInsert.length;

  // Step 6: Update list profile count
  await supabase
    .from("target_lists")
    .update({
      profile_count: (existing?.length || 0) + profilesToInsert.length,
    })
    .eq("id", listId)
    .eq("org_id", orgId);

  return result;
}
