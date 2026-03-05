import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStrategy } from "@/lib/ai/strategy-agent";
import { createCalendar } from "@/lib/actions/strategy";
import type { GenerateStrategyRequest } from "@/types/strategy";
import type { TargetList, TargetProfile } from "@/types/targets";

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
    const body: GenerateStrategyRequest = await request.json();

    if (!body.target_list_id || !body.week_start) {
      return NextResponse.json(
        { error: "target_list_id and week_start are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch target list
    const { data: targetList, error: listError } = await supabase
      .from("target_lists")
      .select("*")
      .eq("id", body.target_list_id)
      .eq("org_id", authUser.member.org_id)
      .single();

    if (listError || !targetList) {
      return NextResponse.json(
        { error: "Target list not found" },
        { status: 404 }
      );
    }

    // Fetch profiles in the list
    const { data: profiles } = await supabase
      .from("target_profiles")
      .select("*")
      .eq("list_id", body.target_list_id)
      .eq("org_id", authUser.member.org_id)
      .eq("status", "active")
      .limit(100);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: "No active profiles in this list" },
        { status: 400 }
      );
    }

    // Generate strategy via Claude API
    const aiResponse = await generateStrategy({
      targetList: targetList as TargetList,
      profiles: profiles as TargetProfile[],
      weekStart: body.week_start,
    });

    // Save calendar
    const calendar = await createCalendar({
      week_start: body.week_start,
      target_list_id: body.target_list_id,
      strategy_text: aiResponse.strategy_text,
      calendar_json: aiResponse.calendar_entries,
    });

    return NextResponse.json({
      data: {
        calendar,
        strategy: aiResponse,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/strategy/generate error:", error);
    return NextResponse.json({ error: "Strategy generation failed" }, { status: 500 });
  }
}
