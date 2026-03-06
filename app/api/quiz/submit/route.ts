import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreCandidate } from "@/lib/ai/scoring";
import { scoreCandidateDynamic } from "@/lib/ai/dynamic-scoring";
import { getScoringWeights } from "@/lib/actions/scoring-profiles";
import { runAutoTicketWorkflow } from "@/lib/tickets/auto-workflow";
import { trackFunnelEvent } from "@/lib/tracking/funnel";
import type { QuizResultResponse } from "@/types/dto";

interface QuizSubmitBody {
  campaign_id?: string;
  answers?: Record<string, unknown>;
  // Legacy fields (backward compat)
  sports_exp?: string;
  interests?: string[];
  area?: string;
  age_range?: string;
  start_timing?: string;
  name?: string;
  email?: string;
  line_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuizSubmitBody = await request.json();
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

    // Build answers object (support both new and legacy format)
    const answers: Record<string, unknown> = body.answers || {
      sports_exp: body.sports_exp,
      interests: body.interests,
      area: body.area,
      age_range: body.age_range,
      start_timing: body.start_timing,
    };

    // Score the candidate (dynamic if campaign_id provided, else static fallback)
    let scoreResult: { score: number; factors: Record<string, number> };

    if (body.campaign_id) {
      const weights = await getScoringWeights(body.campaign_id);
      if (weights) {
        scoreResult = scoreCandidateDynamic(answers, weights);
      } else {
        scoreResult = scoreCandidate({
          sports_exp: String(answers.sports_exp || ""),
          interests: (answers.interests as string[]) || [],
          area: String(answers.area || ""),
          age_range: String(answers.age_range || ""),
          start_timing: String(answers.start_timing || ""),
        });
      }
    } else {
      scoreResult = scoreCandidate({
        sports_exp: String(answers.sports_exp || ""),
        interests: (answers.interests as string[]) || [],
        area: String(answers.area || ""),
        age_range: String(answers.age_range || ""),
        start_timing: String(answers.start_timing || ""),
      });
    }

    // Find best matching store by area
    const areaText = String(answers.area || "");
    const { data: stores } = await supabase
      .from("stores")
      .select("*")
      .eq("org_id", org.id)
      .eq("is_active", true);

    const matchedStore =
      stores?.find((s) => s.location_text?.includes(areaText)) || stores?.[0];

    // Save candidate
    const { data: candidate, error: candidateErr } = await supabase
      .from("candidates")
      .insert({
        org_id: org.id,
        store_id: matchedStore?.id || null,
        campaign_id: body.campaign_id || null,
        source_channel: body.utm_source ? "meta_ad" : "direct",
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
        name: body.name || (answers.name as string) || null,
        email: body.email || (answers.email as string) || null,
        line_user_id: body.line_id || null,
        quiz_answers: answers,
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

    // Track funnel event (quiz_complete)
    trackFunnelEvent({
      org_id: org.id,
      funnel_step: "quiz_complete",
      entry_source: body.utm_source || "direct",
      referral_platform: body.utm_medium || undefined,
      candidate_id: candidate.id,
      metadata: { score: scoreResult.score, campaign_id: body.campaign_id },
    }).catch((err) =>
      console.error("Funnel tracking error:", err)
    );

    // Trigger auto-ticket workflow (non-blocking)
    runAutoTicketWorkflow(candidate.id).catch((err) =>
      console.error("Auto-ticket workflow error:", err)
    );

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
      line_friend_url: "https://line.me/R/ti/p/@dr-stretch",
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
