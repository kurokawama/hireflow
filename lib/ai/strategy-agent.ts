import Anthropic from "@anthropic-ai/sdk";
import type { TargetList, TargetProfile } from "@/types/targets";
import type { AIStrategyResponse, CalendarEntry } from "@/types/strategy";

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

interface StrategyContext {
  targetList: TargetList;
  profiles: TargetProfile[];
  weekStart: string; // ISO date
}

const SYSTEM_PROMPT = `You are an AI content strategist for a Japanese recruitment marketing platform.
Your role is to analyze a target audience list and generate a weekly content calendar optimized for SNS recruitment.

RULES:
1. Always respond in Japanese
2. Output must be valid JSON only — no text outside JSON
3. Calendar entries should target the specific personas in the audience list
4. Recommend a mix of content types (text posts, images, video scripts)
5. Consider platform-specific best practices:
   - Instagram Reels: 15-30sec, hook in first 1.5sec, no watermarks
   - TikTok: 15-30sec, completion rate target 70%, save/share > likes
   - YouTube: Educational/behind-the-scenes, SEO-optimized titles
   - X: Short, provocative, thread-friendly
   - Facebook: Community-building, longer-form OK
   - LINE: Personal, high open rates, CTA-focused
6. Prioritize content that showcases workplace culture and staff personalities
7. For recruitment: "show, don't tell" — real workplace footage > polished ads

OUTPUT FORMAT:
{
  "strategy_text": "日本語での戦略概要（2-3段落）",
  "calendar_entries": [
    {
      "day": "2026-03-09",
      "platform": "instagram",
      "content_type": "text",
      "topic": "トピック名",
      "target_persona": "ターゲットペルソナ",
      "priority": "high"
    }
  ]
}`;

function buildPrompt(context: StrategyContext): string {
  const { targetList, profiles, weekStart } = context;

  // Summarize persona distribution
  const personaCounts: Record<string, number> = {};
  const platformCounts: Record<string, number> = {};
  for (const p of profiles) {
    personaCounts[p.persona_category] =
      (personaCounts[p.persona_category] || 0) + 1;
    platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
  }

  // Sample profiles (max 10 for token efficiency)
  const sampleProfiles = profiles.slice(0, 10).map((p) => ({
    platform: p.platform,
    display_name: p.display_name,
    bio: p.bio?.substring(0, 100),
    interest_tags: p.interest_tags,
    persona_category: p.persona_category,
    follower_count: p.follower_count,
  }));

  return `## Target List
- Name: ${targetList.name}
- Brand: ${targetList.brand || "All brands"}
- Keywords: ${targetList.keywords.join(", ") || "None specified"}
- Total profiles: ${profiles.length}

## Persona Distribution
${Object.entries(personaCounts)
  .map(([k, v]) => `- ${k}: ${v} profiles`)
  .join("\n")}

## Platform Distribution
${Object.entries(platformCounts)
  .map(([k, v]) => `- ${k}: ${v} profiles`)
  .join("\n")}

## Sample Profiles
${JSON.stringify(sampleProfiles, null, 2)}

## Week Start
${weekStart} (Monday)

Generate a weekly content calendar (Mon-Sun, 7 days) with 1-2 posts per day across the most relevant platforms for this audience. Total: 7-14 entries.`;
}

export async function generateStrategy(
  context: StrategyContext
): Promise<AIStrategyResponse> {
  const userPrompt = buildPrompt(context);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude API");
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Invalid AI response format");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      strategy_text: parsed.strategy_text || "",
      calendar_entries: (parsed.calendar_entries || []) as CalendarEntry[],
    };
  } catch {
    throw new Error("Failed to parse AI strategy response");
  }
}
