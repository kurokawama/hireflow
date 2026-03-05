import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareLeaderboard } from "@/lib/advocacy/kit-generator";

// GET: Get share stats / leaderboard
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth([
      "admin",
      "hq_staff",
      "store_manager",
      "trainer",
    ]);

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "month") as
      | "week"
      | "month"
      | "all";
    const kitId = searchParams.get("kit_id");

    // If kit_id specified, return shares for that kit
    if (kitId) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("staff_shares")
        .select(`
          *,
          posting_kits(title, theme)
        `)
        .eq("org_id", authUser.member.org_id)
        .eq("kit_id", kitId)
        .order("shared_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    // Otherwise return leaderboard
    const leaderboard = await getShareLeaderboard(
      authUser.member.org_id,
      period
    );

    return NextResponse.json({ data: leaderboard });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Record a staff share
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth([
      "admin",
      "hq_staff",
      "store_manager",
      "trainer",
    ]);
    const body: {
      kit_id: string;
      platform: string;
      post_url?: string;
    } = await request.json();

    if (!body.kit_id || !body.platform) {
      return NextResponse.json(
        { error: "kit_id and platform are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify kit exists and belongs to org
    const { data: kit } = await supabase
      .from("posting_kits")
      .select("id")
      .eq("id", body.kit_id)
      .eq("org_id", authUser.member.org_id)
      .single();

    if (!kit) {
      return NextResponse.json(
        { error: "Posting kit not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("staff_shares")
      .insert({
        org_id: authUser.member.org_id,
        kit_id: body.kit_id,
        user_id: authUser.userId,
        platform: body.platform,
        post_url: body.post_url || null,
        shared_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/advocacy/shares error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
