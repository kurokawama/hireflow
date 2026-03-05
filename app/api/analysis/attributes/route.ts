import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { analyzeListAttributes } from "@/lib/ai/attribute-analyzer";
import { createAdminClient } from "@/lib/supabase/admin";

// POST: Analyze target list profiles and generate targeting attributes
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff"]);
    const body: { target_list_id: string } = await request.json();

    if (!body.target_list_id) {
      return NextResponse.json(
        { error: "target_list_id is required" },
        { status: 400 }
      );
    }

    // Verify list belongs to user's org
    const supabase = createAdminClient();
    const { data: list } = await supabase
      .from("target_lists")
      .select("id, name, profile_count")
      .eq("id", body.target_list_id)
      .eq("org_id", authUser.member.org_id)
      .single();

    if (!list) {
      return NextResponse.json(
        { error: "Target list not found" },
        { status: 404 }
      );
    }

    // Run AI analysis
    const analysis = await analyzeListAttributes(
      body.target_list_id,
      authUser.member.org_id
    );

    // Save to DB
    const { data: saved, error: saveError } = await supabase
      .from("attribute_analyses")
      .insert({
        org_id: authUser.member.org_id,
        target_list_id: body.target_list_id,
        summary_text: analysis.summary_text,
        targeting_attributes: analysis.targeting_attributes,
        recommended_platforms: analysis.recommended_platforms,
        recommended_daily_budget_jpy: analysis.recommended_daily_budget_jpy,
        strategy_notes: analysis.strategy_notes,
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json(
        { error: `Failed to save analysis: ${saveError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: saved });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/analysis/attributes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
