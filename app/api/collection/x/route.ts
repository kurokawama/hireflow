import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchXUsers, xUserToProfileData } from "@/lib/collection/x-search";
import { scoreProfiles } from "@/lib/ai/profile-scorer";
import type { CollectionCriteria } from "@/types/targets";

// POST: Trigger X API collection
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
    const body: {
      list_id: string;
      criteria: CollectionCriteria;
    } = await request.json();

    if (!body.list_id || !body.criteria?.keywords?.length) {
      return NextResponse.json(
        { error: "list_id and criteria with keywords are required" },
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

    // Search X for each keyword
    const maxPerKeyword = body.criteria.max_results_per_keyword || 25;
    const allUsers = [];
    const errors: string[] = [];

    for (const keyword of body.criteria.keywords) {
      try {
        const users = await searchXUsers(keyword, maxPerKeyword);
        allUsers.push(...users);
      } catch (err) {
        errors.push(
          `Keyword "${keyword}": ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    // Deduplicate by user ID
    const seen = new Set<string>();
    const uniqueUsers = allUsers.filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });

    if (uniqueUsers.length === 0) {
      return NextResponse.json({
        data: {
          profiles_found: 0,
          profiles_added: 0,
          profiles_skipped: 0,
          profiles_duplicate: 0,
          errors,
        },
      });
    }

    // Check for duplicates in DB
    const { data: existingProfiles } = await supabase
      .from("target_profiles")
      .select("username")
      .eq("list_id", body.list_id)
      .eq("platform", "x");

    const existingUsernames = new Set(
      (existingProfiles || []).map(
        (p: { username: string }) => p.username?.toLowerCase()
      )
    );

    const newUsers = uniqueUsers.filter(
      (u) => !existingUsernames.has(u.username.toLowerCase())
    );

    const duplicates = uniqueUsers.length - newUsers.length;

    // AI scoring
    const profileInputs = newUsers.map((u) => ({
      platform: "x",
      username: u.username,
      display_name: u.name,
      description: u.description,
      subscriber_count: u.public_metrics.followers_count,
    }));

    const scores = await scoreProfiles(profileInputs, body.criteria);

    // Filter by score threshold and insert
    const threshold = body.criteria.score_threshold || 50;
    let added = 0;
    let skipped = 0;

    for (let i = 0; i < newUsers.length; i++) {
      const user = newUsers[i];
      const profileData = xUserToProfileData(user);
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
          platform: profileData.platform,
          profile_url: profileData.profile_url,
          username: profileData.username,
          display_name: profileData.display_name,
          bio: profileData.bio,
          follower_count: profileData.follower_count,
          interest_tags: score.interest_tags,
          persona_category: score.persona_category,
          ai_score: score.score,
          score_factors: score.score_factors,
          source: "x_api",
          status: "active",
          created_by: authUser.userId,
        });

      if (insertError) {
        errors.push(`Failed to insert @${user.username}: ${insertError.message}`);
      } else {
        added++;
      }
    }

    // Note: profile_count is auto-updated by DB trigger on target_profiles insert/delete

    return NextResponse.json({
      data: {
        profiles_found: uniqueUsers.length,
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
      error.message === "X_API_BEARER_TOKEN is not configured"
    ) {
      return NextResponse.json(
        { error: "X API is not configured. Set X_API_BEARER_TOKEN in environment variables." },
        { status: 503 }
      );
    }
    console.error("POST /api/collection/x error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
