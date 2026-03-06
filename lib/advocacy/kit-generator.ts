// Posting Kit Generator — AI-powered weekly content kit creation
// Generates "きっかけキット" for staff Employee Advocacy

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KitHint } from "@/types/advocacy";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a social media content strategist for a Japanese fitness company (Dr.Stretch / Wecle brands).
Your job is to create weekly "きっかけキット" (inspiration kits) for staff to share on their personal SNS accounts.

IMPORTANT DESIGN PRINCIPLES:
- Staff should post in their OWN voice, not corporate copy-paste
- Each kit provides a THEME and HINTS, not finished posts
- Content should double as personal branding for the staff member
- 200 staff members should produce 200 DIFFERENT posts from the same kit

OUTPUT FORMAT (JSON only):
{
  "title": "今週のテーマ: [テーマ名]",
  "theme": "[テーマの説明 — 2-3文]",
  "hints": [
    {"hint_text": "[具体的な撮影/投稿のヒント]", "example_description": "[こんな投稿になるイメージ]"},
    {"hint_text": "[別のヒント]", "example_description": "[別のイメージ]"},
    {"hint_text": "[別のヒント]", "example_description": "[別のイメージ]"}
  ],
  "hashtags": ["#ハッシュタグ1", "#ハッシュタグ2", "#ハッシュタグ3", "#ハッシュタグ4"],
  "template_text": "[コピペ用テンプレテキスト（使いたい人向け、任意使用）]"
}

RULES:
1. Japanese only for all content
2. Hashtags should be a mix of brand + industry + lifestyle tags
3. Include 3-5 hints per kit
4. Template text is optional — for staff who want a starting point
5. Content should feel authentic, not corporate`;

interface GenerateKitParams {
  brand: string; // "dr_stretch" | "wecle"
  targetAudience?: string; // From attribute analysis
  weekNumber?: number;
  previousThemes?: string[]; // Avoid repeating themes
}

interface GeneratedKit {
  title: string;
  theme: string;
  hints: KitHint[];
  hashtags: string[];
  template_text: string | null;
}

export async function generatePostingKit(
  params: GenerateKitParams
): Promise<GeneratedKit> {
  const brandName =
    params.brand === "dr_stretch" ? "Dr.stretch" : "Wecle";

  const userPrompt = `## Kit Generation Request

Brand: ${brandName}
${params.targetAudience ? `Target audience: ${params.targetAudience}` : ""}
${params.weekNumber ? `Week: ${params.weekNumber}` : ""}
${params.previousThemes?.length ? `Previous themes to avoid: ${params.previousThemes.join(", ")}` : ""}

Generate a weekly posting kit for ${brandName} staff members.
The kit should inspire authentic posts about their daily work life as fitness/stretch professionals.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI kit generation failed: no response");
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI kit generation failed: invalid format");
  }

  const parsed = JSON.parse(jsonMatch[0]) as GeneratedKit;

  return {
    title: parsed.title || "今週のきっかけキット",
    theme: parsed.theme || "",
    hints: (parsed.hints || []).map((h) => ({
      hint_text: h.hint_text || "",
      example_description: h.example_description || null,
    })),
    hashtags: parsed.hashtags || [],
    template_text: parsed.template_text || null,
  };
}

// Save a generated kit to the database
export async function savePostingKit(params: {
  orgId: string;
  userId: string;
  kit: GeneratedKit;
  targetListId?: string;
  brand?: string;
  scheduledAt?: string;
}): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("posting_kits")
    .insert({
      org_id: params.orgId,
      title: params.kit.title,
      theme: params.kit.theme,
      hints: params.kit.hints,
      hashtags: params.kit.hashtags,
      template_text: params.kit.template_text,
      target_list_id: params.targetListId || null,
      brand: params.brand || null,
      scheduled_at: params.scheduledAt || null,
      status: params.scheduledAt ? "scheduled" : "draft",
      created_by: params.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save kit: ${error?.message}`);
  }

  return data.id;
}

// Get leaderboard data
export async function getShareLeaderboard(
  orgId: string,
  period: "week" | "month" | "all" = "month"
): Promise<{
  staff: Array<{
    user_id: string;
    display_name: string;
    store_name: string;
    share_count: number;
    is_champion: boolean;
  }>;
  stores: Array<{
    store_id: string;
    store_name: string;
    brand: string;
    total_shares: number;
  }>;
}> {
  const supabase = createAdminClient();

  // Staff leaderboard
  const { data: staffData } = await supabase.rpc("get_share_leaderboard_staff", {
    p_org_id: orgId,
    p_period: period,
  });

  // Store leaderboard
  const { data: storeData } = await supabase.rpc("get_share_leaderboard_store", {
    p_org_id: orgId,
    p_period: period,
  });

  return {
    staff: (staffData || []) as Array<{
      user_id: string;
      display_name: string;
      store_name: string;
      share_count: number;
      is_champion: boolean;
    }>,
    stores: (storeData || []) as Array<{
      store_id: string;
      store_name: string;
      brand: string;
      total_shares: number;
    }>,
  };
}
