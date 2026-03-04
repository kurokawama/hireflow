import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreCandidate } from "@/lib/ai/scoring";
import type { QuizSubmitRequest, QuizResultResponse } from "@/types/dto";

export async function POST(request: NextRequest) {
  try {
    const body: QuizSubmitRequest = await request.json();
    const supabase = createAdminClient();

    // Get the organization (single org)
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 500 }
      );
    }

    // Score the candidate
    const scoreResult = scoreCandidate({
      sports_exp: body.sports_exp,
      interests: body.interests,
      area: body.area,
      age_range: body.age_range,
      start_timing: body.start_timing,
    });

    // Find best matching store by area
    const { data: stores } = await supabase
      .from("stores")
      .select("*")
      .eq("org_id", org.id)
      .eq("is_active", true);

    // Simple area matching (find store in same area)
    const matchedStore = stores?.find((s) =>
      s.location_text?.includes(body.area)
    ) || stores?.[0];

    // Save candidate
    const { data: candidate, error: candidateErr } = await supabase
      .from("candidates")
      .insert({
        org_id: org.id,
        store_id: matchedStore?.id || null,
        source_channel: body.utm_source ? "meta_ad" : "direct",
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
        name: body.name || null,
        email: body.email || null,
        line_user_id: body.line_id || null,
        quiz_answers: {
          sports_exp: body.sports_exp,
          interests: body.interests,
          area: body.area,
          age_range: body.age_range,
          start_timing: body.start_timing,
        },
        ai_score: scoreResult.score,
        score_factors: scoreResult.factors,
        matched_store_id: matchedStore?.id || null,
        stage: "quiz_completed",
      })
      .select()
      .single();

    if (candidateErr || !candidate) {
      return NextResponse.json(
        { error: "Failed to save candidate" },
        { status: 500 }
      );
    }

    // Record event
    await supabase.from("candidate_events").insert({
      org_id: org.id,
      candidate_id: candidate.id,
      event: "quiz_completed",
      metadata: { score: scoreResult.score, factors: scoreResult.factors },
    });

    const response: QuizResultResponse = {
      candidate_id: candidate.id,
      matched_store: {
        id: matchedStore?.id || "",
        store_name: matchedStore?.store_name || "",
        brand: matchedStore?.brand || "dr_stretch",
        location_text: matchedStore?.location_text || "",
      },
      score: scoreResult.score,
      apply_url: `${process.env.APP_BASE_URL || ""}/quiz/result?id=${candidate.id}`,
      line_friend_url: "https://line.me/R/ti/p/@dr-stretch", // TODO: configure per store
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("Quiz submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
