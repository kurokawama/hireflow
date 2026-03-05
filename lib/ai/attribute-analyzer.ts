// AI Attribute Analyzer — Analyzes target list profiles and generates
// targeting attributes for ad platforms (Meta Ads, Google Ads, X Ads)

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TargetingAttributes } from "@/types/ads";
import type { TargetProfile } from "@/types/targets";

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI marketing analyst for a Japanese staffing company (Dr.Stretch / Wecle fitness brands).
Your job is to analyze a list of SNS profiles and generate ad targeting attributes.

INPUT: A list of profiles with their scores, age estimates, locations, and interest tags.
OUTPUT: A structured targeting recommendation for ad platforms.

RULES:
1. Output must be valid JSON only — no text outside JSON
2. Summarize the demographic patterns in Japanese
3. Recommend realistic daily budgets in JPY (¥3,000-30,000 range for SMBs)
4. Platform recommendations should be based on where the target audience is most active
5. Be specific with interests — use terms that match Meta Ads interest categories

OUTPUT FORMAT:
{
  "age_min": 20,
  "age_max": 30,
  "locations": ["東京", "大阪"],
  "interests": ["フィットネス", "パーソナルトレーニング", "ヨガ", "スポーツ"],
  "gender": "all",
  "attribute_summary": "20-30歳、東京・大阪圏、フィットネス・スポーツ関心層、SNS活用度が高い層",
  "analysis_details": {
    "total_profiles_analyzed": 150,
    "age_distribution": {"20-25": 45, "26-30": 38, "31-35": 22, "unknown": 45},
    "location_distribution": {"東京": 52, "大阪": 28, "その他": 35, "不明": 35},
    "interest_distribution": {"フィットネス": 80, "サッカー": 35, "ヨガ": 25},
    "persona_distribution": {"trainer_candidate": 40, "potential_applicant": 60, "industry_influencer": 30, "competitor_staff": 20}
  },
  "recommended_platforms": ["meta", "google"],
  "recommended_daily_budget_jpy": 5000,
  "strategy_notes": "この層はInstagramの利用率が高く、Meta Adsでのリーチが最も効率的です。YouTube広告は動画コンテンツがある場合に有効。"
}`;

interface AnalysisResult {
  targeting_attributes: TargetingAttributes;
  recommended_platforms: ("meta" | "google" | "x")[];
  recommended_daily_budget_jpy: number;
  strategy_notes: string;
  summary_text: string;
}

export async function analyzeListAttributes(
  listId: string,
  orgId: string
): Promise<AnalysisResult> {
  const supabase = createAdminClient();

  // Fetch all profiles in the list
  const { data: profiles, error } = await supabase
    .from("target_profiles")
    .select("*")
    .eq("list_id", listId)
    .eq("org_id", orgId)
    .order("ai_score", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }

  if (!profiles || profiles.length === 0) {
    throw new Error("リストにプロフィールがありません。先にプロフィールを収集してください。");
  }

  const typedProfiles = profiles as unknown as TargetProfile[];

  // Build analysis prompt
  const profileSummaries = typedProfiles.slice(0, 200).map((p, i) => ({
    index: i,
    platform: p.platform,
    display_name: p.display_name,
    bio: (p.bio || "").substring(0, 150),
    follower_count: p.follower_count,
    ai_score: p.ai_score,
    interest_tags: p.interest_tags,
    persona_category: p.persona_category,
    score_factors: p.score_factors,
  }));

  const userPrompt = `## Target List Analysis Request

Total profiles in list: ${typedProfiles.length}
Profiles included in analysis: ${profileSummaries.length}

## Profile Data (top ${profileSummaries.length} by AI score)

${JSON.stringify(profileSummaries, null, 2)}

Analyze these profiles and generate targeting attributes for ad campaigns.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI analysis failed: no response text");
  }

  // Extract JSON from response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI analysis failed: invalid response format");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    age_min: number | null;
    age_max: number | null;
    locations: string[];
    interests: string[];
    gender: "all" | "male" | "female" | null;
    attribute_summary: string;
    analysis_details: TargetingAttributes["analysis_details"];
    recommended_platforms: ("meta" | "google" | "x")[];
    recommended_daily_budget_jpy: number;
    strategy_notes: string;
  };

  const targetingAttributes: TargetingAttributes = {
    age_min: parsed.age_min,
    age_max: parsed.age_max,
    locations: parsed.locations || [],
    interests: parsed.interests || [],
    gender: parsed.gender || "all",
    attribute_summary: parsed.attribute_summary,
    analysis_details: {
      total_profiles_analyzed: typedProfiles.length,
      age_distribution: parsed.analysis_details?.age_distribution || {},
      location_distribution: parsed.analysis_details?.location_distribution || {},
      interest_distribution: parsed.analysis_details?.interest_distribution || {},
      persona_distribution: parsed.analysis_details?.persona_distribution || {},
    },
  };

  return {
    targeting_attributes: targetingAttributes,
    recommended_platforms: parsed.recommended_platforms || ["meta"],
    recommended_daily_budget_jpy: parsed.recommended_daily_budget_jpy || 5000,
    strategy_notes: parsed.strategy_notes || "",
    summary_text: parsed.attribute_summary,
  };
}
