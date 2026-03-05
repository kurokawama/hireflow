import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateAdCampaignRequest } from "@/types/ads";

// GET: List all ad campaigns for the org
export async function GET() {
  try {
    const authUser = await requireAuth(["admin", "hq_staff"]);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("ad_campaigns")
      .select(`
        *,
        ad_audiences(name, audience_type, platform, targeting_attributes),
        generated_contents(body_text, platform, status)
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

// POST: Create a new ad campaign
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff"]);
    const body: CreateAdCampaignRequest = await request.json();

    if (!body.name || !body.platform || !body.audience_id || !body.content_id) {
      return NextResponse.json(
        { error: "name, platform, audience_id, and content_id are required" },
        { status: 400 }
      );
    }

    if (body.daily_budget_jpy < 0) {
      return NextResponse.json(
        { error: "daily_budget_jpy must be a positive number" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify audience and content belong to user's org
    const { data: audience } = await supabase
      .from("ad_audiences")
      .select("id")
      .eq("id", body.audience_id)
      .eq("org_id", authUser.member.org_id)
      .single();

    if (!audience) {
      return NextResponse.json(
        { error: "Audience not found" },
        { status: 404 }
      );
    }

    const { data: content } = await supabase
      .from("generated_contents")
      .select("id")
      .eq("id", body.content_id)
      .eq("org_id", authUser.member.org_id)
      .single();

    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("ad_campaigns")
      .insert({
        org_id: authUser.member.org_id,
        name: body.name,
        platform: body.platform,
        audience_id: body.audience_id,
        content_id: body.content_id,
        daily_budget_jpy: body.daily_budget_jpy,
        total_budget_jpy: body.total_budget_jpy || null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        status: "draft",
        created_by: authUser.userId,
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
    console.error("POST /api/ads/campaigns error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
