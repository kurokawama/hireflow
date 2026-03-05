import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { runBatchCollection } from "@/lib/youtube/batch-collect";
import type { CollectionCriteria } from "@/types/targets";

interface RouteParams {
  params: { listId: string };
}

// POST: Trigger automated collection for a target list
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
    const body: { criteria: CollectionCriteria } = await request.json();

    if (!body.criteria?.keywords?.length) {
      return NextResponse.json(
        { error: "At least one keyword is required" },
        { status: 400 }
      );
    }

    // Validate criteria
    const criteria: CollectionCriteria = {
      keywords: body.criteria.keywords.filter((k) => k.trim()),
      age_min: body.criteria.age_min || undefined,
      age_max: body.criteria.age_max || undefined,
      location: body.criteria.location?.trim() || undefined,
      platforms: body.criteria.platforms?.length
        ? body.criteria.platforms
        : ["youtube"],
      score_threshold: Math.max(0, Math.min(100, body.criteria.score_threshold || 50)),
      max_results_per_keyword: Math.max(
        1,
        Math.min(50, body.criteria.max_results_per_keyword || 25)
      ),
    };

    // Verify list belongs to user's org
    const supabase = createAdminClient();
    const { data: list } = await supabase
      .from("target_lists")
      .select("id, org_id")
      .eq("id", params.listId)
      .eq("org_id", authUser.member.org_id)
      .single();

    if (!list) {
      return NextResponse.json(
        { error: "Target list not found" },
        { status: 404 }
      );
    }

    // Save collection criteria to the list
    await supabase
      .from("target_lists")
      .update({
        collection_criteria: criteria,
        keywords: criteria.keywords,
        platform_filter: criteria.platforms,
      })
      .eq("id", params.listId)
      .eq("org_id", authUser.member.org_id);

    // Run batch collection
    const result = await runBatchCollection({
      listId: params.listId,
      orgId: authUser.member.org_id,
      userId: authUser.userId,
      criteria,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof Error &&
      error.message === "YOUTUBE_API_KEY is not configured"
    ) {
      return NextResponse.json(
        { error: "YouTube API is not configured. Contact administrator." },
        { status: 503 }
      );
    }
    console.error("POST /api/targets/lists/[listId]/collect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
