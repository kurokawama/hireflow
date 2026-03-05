import Anthropic from "@anthropic-ai/sdk";
import type {
  CollectionCriteria,
  ProfileScoreResult,
  YouTubeSearchResult,
} from "@/types/targets";

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI recruitment profile analyzer for a Japanese staffing company (Dr.Stretch / Wecle brands).
Your job is to evaluate SNS profiles and score them for recruitment potential as fitness/stretch trainers.

SCORING CRITERIA (each 0-20, total 0-100):
1. relevance: How relevant is the person's content to fitness/sports/health?
2. activity: How active is the person on the platform? (posting frequency, engagement)
3. audience_size: Follower/subscriber count relative to the platform norms
4. content_quality: Quality and professionalism of content
5. recruitment_fit: How likely is this person to be interested in a trainer/fitness career?

AGE ESTIMATION:
- Analyze bio text, content style, and context clues
- Look for: university year (大学N年→~18+N), work experience years (社会人N年目→~22+N)
- Sports career mentions, graduation years, birth year hints
- If uncertain, provide a wider range (e.g., 20-30)
- If no clues at all, set estimated_age_min and estimated_age_max to null

LOCATION ESTIMATION:
- Look for city/prefecture mentions in bio
- Content location clues (gym names, landmarks)
- If uncertain, set to null

PERSONA CATEGORIZATION:
- trainer_candidate: Actively works in fitness/sports, could become a trainer
- competitor_staff: Works at a competing gym/stretch studio
- industry_influencer: Fitness/health content creator with significant following
- potential_applicant: Sports-interested person who might apply with encouragement

RULES:
1. Output must be valid JSON only — no text outside JSON
2. Be strict with scoring — most profiles should score 30-60
3. Only score 80+ for profiles that are clearly excellent recruitment targets
4. Score 0-20 for profiles with no fitness/sports relevance

OUTPUT FORMAT:
{
  "score": 65,
  "estimated_age_min": 22,
  "estimated_age_max": 28,
  "estimated_location": "東京",
  "persona_category": "trainer_candidate",
  "interest_tags": ["サッカー", "フィットネス", "パーソナルトレーニング"],
  "score_factors": {
    "relevance": 15,
    "activity": 12,
    "audience_size": 10,
    "content_quality": 14,
    "recruitment_fit": 14
  },
  "reasoning": "スコアリング理由を日本語で1-2文"
}`;

interface ProfileInput {
  platform: string;
  channel_title?: string;
  username?: string;
  display_name?: string;
  description?: string;
  subscriber_count?: number | null;
  video_count?: number | null;
  profile_url?: string;
}

function buildScoringPrompt(
  profiles: ProfileInput[],
  criteria: CollectionCriteria
): string {
  const profilesText = profiles
    .map(
      (p, i) =>
        `### Profile ${i + 1}
- Platform: ${p.platform}
- Name: ${p.channel_title || p.display_name || p.username || "Unknown"}
- Description: ${(p.description || "").substring(0, 300)}
- Subscribers/Followers: ${p.subscriber_count ?? "Unknown"}
- Videos/Posts: ${p.video_count ?? "Unknown"}
- URL: ${p.profile_url || "N/A"}`
    )
    .join("\n\n");

  return `## Collection Criteria
- Keywords: ${criteria.keywords.join(", ")}
- Target age range: ${criteria.age_min || "N/A"} - ${criteria.age_max || "N/A"}
- Target location: ${criteria.location || "Japan (any)"}
- Score threshold: ${criteria.score_threshold}

## Profiles to Analyze (${profiles.length} profiles)

${profilesText}

Analyze each profile and return a JSON array of score results. Output format:
[
  { profile_index: 0, ...score_result },
  { profile_index: 1, ...score_result },
  ...
]`;
}

interface ScoringResponseItem extends ProfileScoreResult {
  profile_index: number;
}

export async function scoreProfiles(
  profiles: ProfileInput[],
  criteria: CollectionCriteria
): Promise<ProfileScoreResult[]> {
  if (profiles.length === 0) return [];

  // Process in batches of 10 to stay within token limits
  const batchSize = 10;
  const results: ProfileScoreResult[] = [];

  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, i + batchSize);
    const batchResults = await scoreBatch(batch, criteria);
    results.push(...batchResults);
  }

  return results;
}

async function scoreBatch(
  profiles: ProfileInput[],
  criteria: CollectionCriteria
): Promise<ProfileScoreResult[]> {
  const userPrompt = buildScoringPrompt(profiles, criteria);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    // Return default scores on API failure
    return profiles.map(() => defaultScore());
  }

  const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return profiles.map(() => defaultScore());
  }

  try {
    const parsed: ScoringResponseItem[] = JSON.parse(jsonMatch[0]);
    // Map results back to profile order
    return profiles.map((_, index) => {
      const item = parsed.find((r) => r.profile_index === index);
      if (!item) return defaultScore();
      return {
        score: clamp(item.score, 0, 100),
        estimated_age_min: item.estimated_age_min,
        estimated_age_max: item.estimated_age_max,
        estimated_location: item.estimated_location,
        persona_category: item.persona_category || "potential_applicant",
        interest_tags: item.interest_tags || [],
        score_factors: {
          relevance: clamp(item.score_factors?.relevance ?? 0, 0, 20),
          activity: clamp(item.score_factors?.activity ?? 0, 0, 20),
          audience_size: clamp(item.score_factors?.audience_size ?? 0, 0, 20),
          content_quality: clamp(item.score_factors?.content_quality ?? 0, 0, 20),
          recruitment_fit: clamp(item.score_factors?.recruitment_fit ?? 0, 0, 20),
        },
        reasoning: item.reasoning || "",
      };
    });
  } catch {
    return profiles.map(() => defaultScore());
  }
}

function defaultScore(): ProfileScoreResult {
  return {
    score: 0,
    estimated_age_min: null,
    estimated_age_max: null,
    estimated_location: null,
    persona_category: "potential_applicant",
    interest_tags: [],
    score_factors: {
      relevance: 0,
      activity: 0,
      audience_size: 0,
      content_quality: 0,
      recruitment_fit: 0,
    },
    reasoning: "スコアリング失敗",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Convert YouTube search result to ProfileInput for scoring
export function youtubeResultToProfileInput(
  result: YouTubeSearchResult
): ProfileInput {
  return {
    platform: "youtube",
    channel_title: result.channel_title,
    description: result.description,
    subscriber_count: result.subscriber_count,
    video_count: result.video_count,
    profile_url: result.profile_url,
  };
}
