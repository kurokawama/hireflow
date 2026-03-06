import Anthropic from "@anthropic-ai/sdk";
import type { Profile, Store, StaffVoice, PromptTemplate } from "@/types/database";
import type { Platform } from "@/types/database";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateContentInput {
  profile: Profile;
  store: Store;
  staffVoices: StaffVoice[];
  templates: PromptTemplate[];
  platforms: Platform[];
  applyLinks: Record<string, string>;
}

interface PlatformContent {
  platform: Platform;
  body_text: string;
  parts_json: Record<string, unknown>;
  compliance_notes: string[];
}

export async function generateContent(
  input: GenerateContentInput
): Promise<PlatformContent[]> {
  const { profile, store, staffVoices, templates, platforms, applyLinks } = input;

  // Build the combined prompt for all platforms
  // Default format instructions for platforms without templates
  const defaultPlatformFormats: Record<string, string> = {
    facebook:
      "Facebook post format: engaging text (max 500 chars), 2-3 hashtags, call-to-action. Focus on storytelling and community engagement.",
    x: "X (Twitter) format: concise text (max 280 chars), 2-3 relevant hashtags. Punchy and attention-grabbing.",
    youtube:
      "YouTube description format: detailed description (300-1000 chars), relevant keywords, timestamps section if applicable. Include call-to-action.",
  };

  const platformInstructions = platforms
    .map((p) => {
      const template = templates.find((t) => t.platform === p);
      const formatInstructions =
        template?.developer_prompt ||
        defaultPlatformFormats[p] ||
        `${p.toUpperCase()} format: generate appropriate content for this platform.`;
      return `
### ${p.toUpperCase()} format:
${formatInstructions}
Apply link for ${p}: ${applyLinks[p] || ""}
`;
    })
    .join("\n");

  const staffVoiceTexts = staffVoices
    .map((v) => `- ${v.speaker_name}: "${v.content_raw}" (highlights: ${v.highlights.join(", ")})`)
    .join("\n");

  const systemPrompt = templates[0]?.system_prompt || `You are an expert recruitment content creator for the Japanese market. Generate engaging, authentic content that feels like organic social media posts — NOT job ads. Write in Japanese.`;

  const userPrompt = `
## Brand Information
- Brand: ${profile.brand_name}
- Values: ${profile.values}
- Tone: ${profile.tone}
- Must include: ${profile.must_include.join(", ")}
- NG words (never use): ${profile.ng_words.join(", ")}
${profile.compliance_note ? `- Compliance: ${profile.compliance_note}` : ""}

## Store Information
- Store: ${store.store_name}
- Location: ${store.location_text}
${store.memo ? `- Notes: ${store.memo}` : ""}

## Staff Voices (use as material — quote or summarize, do NOT fabricate)
${staffVoiceTexts || "No staff voices provided."}

## Output Requirements
Generate content for the following platforms. Output ONLY valid JSON.
${platformInstructions}

## Hard Rules
1. Do not fabricate facts not in the input
2. Staff voices: quote/summarize only (no new facts)
3. All must_include items must appear in the final text
4. None of the NG words may appear
5. Content must feel like organic posts, NOT job advertisements
6. All text in Japanese

## Output Format
Return a JSON object with this structure:
{
  "platforms": {
    "<platform>": {
      "body_text": "complete post text ready to copy",
      "parts_json": { ... platform-specific structured parts ... },
      "compliance_notes": ["any compliance concerns"]
    }
  }
}
`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  // Extract text content
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude API");
  }

  // Parse JSON from response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from Claude response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const results: PlatformContent[] = [];

  for (const platform of platforms) {
    const platformData = parsed.platforms?.[platform];
    if (platformData) {
      results.push({
        platform,
        body_text: platformData.body_text || "",
        parts_json: platformData.parts_json || platformData,
        compliance_notes: platformData.compliance_notes || [],
      });
    }
  }

  return results;
}
