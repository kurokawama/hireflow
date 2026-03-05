import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAudienceFromList } from "@/lib/ads/audience-builder";
import type { BuildAudienceRequest } from "@/types/ads";

// GET: List all audiences for the org
export async function GET() {
  try {
    const authUser = await requireAuth(["admin", "hq_staff"]);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("ad_audiences")
      .select(`
        *,
        target_lists(name, profile_count)
      `)
      .eq("org_id", authUser.member.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Build audience from a target list (AI analysis + platform creation)
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff"]);
    const body: BuildAudienceRequest = await request.json();

    if (!body.target_list_id || !body.platform || !body.audience_type) {
      return NextResponse.json(
        { error: "target_list_id, platform, and audience_type are required" },
        { status: 400 }
      );
    }

    const result = await buildAudienceFromList({
      listId: body.target_list_id,
      orgId: authUser.member.org_id,
      userId: authUser.userId,
      platform: body.platform,
      audienceType: body.audience_type,
      name: body.name,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/ads/audiences error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
