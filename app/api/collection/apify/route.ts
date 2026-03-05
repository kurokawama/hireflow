import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  searchInstagramByHashtags,
  searchTikTokByHashtags,
} from "@/lib/collection/apify-client";
import { scoreProfiles } from "@/lib/ai/profile-scorer";
import type { CollectionCriteria } from "@/types/targets";

// POST: Trigger Apify collection for Instagram/TikTok
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
    const body: {
      list_id: string;
      platform: "instagram" | "tiktok";
      criteria: CollectionCriteria;
    } = await request.json();

    if (!body.list_id || !body.platform || !body.criteria?.keywords?.length) {
      return NextResponse.json(
        { error: "list_id, platform, and criteria with keywords are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify list
    const { data: list } = await supabase
      .from("target_lists")
      .select("id, org_id")
      .eq("id", body.list_id)
      .eq("org_id", authUser.member.org_id)
      .single();

    if (!list) {
      return NextResponse.json(
        { error: "Target list not found" },
        { status: 404 }
      );
    }

    // Collect profiles via Apify
    const hashtags = body.criteria.keywords.map((k) =>
      k.startsWith("#") ? k : `#${k}`
    );
    const maxPerKeyword = body.criteria.max_results_per_keyword || 25;

    let profiles;
    if (body.platform === "instagram") {
      profiles = await searchInstagramByHashtags(hashtags, maxPerKeyword);
    } else {
      profiles = await searchTikTokByHashtags(hashtags, maxPerKeyword);
    }

    if (profiles.length === 0) {
      return NextResponse.json({
        data: {
          profiles_found: 0,
          profiles_added: 0,
          profiles_skipped: 0,
          profiles_duplicate: 0,
          errors: [],
        },
      });
    }

    // Check for duplicates
    const { data: existingProfiles } = await supabase
      .from("target_profiles")
      .select("username")
      .eq("list_id", body.list_id)
      .eq("platform", body.platform);

    const existingUsernames = new Set(
      (existingProfiles || []).map(
        (p: { username: string }) => p.username?.toLowerCase()
      )
    );

    const newProfiles = profiles.filter(
      (p) => !existingUsernames.has(p.username.toLowerCase())
    );

    const duplicates = profiles.length - newProfiles.length;

    // AI scoring
    const profileInputs = newProfiles.map((p) => ({
      platform: p.platform,
      username: p.username,
      display_name: p.display_name,
      description: p.bio,
      subscriber_count: p.follower_count,
    }));

    const scores = await scoreProfiles(profileInputs, body.criteria);

    // Filter by score threshold and insert
    const threshold = body.criteria.score_threshold || 50;
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < newProfiles.length; i++) {
      const profile = newProfiles[i];
      const score = scores[i];

      if (score.score < threshold) {
        skipped++;
        continue;
      }

      // Age filter
      if (body.criteria.age_min && score.estimated_age_max) {
        if (score.estimated_age_max < body.criteria.age_min) {
          skipped++;
          continue;
        }
      }
      if (body.criteria.age_max && score.estimated_age_min) {
        if (score.estimated_age_min > body.criteria.age_max) {
          skipped++;
          continue;
        }
      }

      const { error: insertError } = await supabase
        .from("target_profiles")
        .insert({
          org_id: authUser.member.org_id,
          list_id: body.list_id,
          platform: body.platform,
          profile_url: profile.profile_url,
          username: profile.username,
          display_name: profile.display_name,
          bio: profile.bio,
          follower_count: profile.follower_count,
          interest_tags: score.interest_tags,
          persona_category: score.persona_category,
          ai_score: score.score,
          score_factors: score.score_factors,
          source: body.platform === "instagram" ? "instagram_apify" : "tiktok_apify",
          status: "active",
          created_by: authUser.userId,
        });

      if (insertError) {
        errors.push(`Failed to insert ${profile.username}: ${insertError.message}`);
      } else {
        added++;
      }
    }

    // Note: profile_count is auto-updated by DB trigger on target_profiles insert/delete

    return NextResponse.json({
      data: {
        profiles_found: profiles.length,
        profiles_added: added,
        profiles_skipped: skipped,
        profiles_duplicate: duplicates,
        errors,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof Error &&
      error.message === "APIFY_API_TOKEN is not configured"
    ) {
      return NextResponse.json(
        { error: "Apify API is not configured. Set APIFY_API_TOKEN in environment variables." },
        { status: 503 }
      );
    }
    console.error("POST /api/collection/apify error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
