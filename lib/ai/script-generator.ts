// AI Script Generator for video content
// Uses Claude API to generate video scripts and shooting guides
import Anthropic from "@anthropic-ai/sdk";
import type { ShootingGuide } from "@/types/video";

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

interface ScriptInput {
  title: string;
  target_audience: string;
  brand: string;
  key_messages: string[];
  duration_seconds: number;
  platform: string;
  store_name?: string;
  brand_values?: string;
}

interface ScriptOutput {
  script_text: string;
  shooting_guide: ShootingGuide;
}

const SYSTEM_PROMPT = `You are an AI video script writer for a Japanese fitness recruitment brand.
Your role is to create engaging video scripts and shooting guides for recruitment marketing content.

RULES:
1. Always write in Japanese
2. Scripts should be natural and conversational, suitable for social media
3. Include specific camera directions and timing
4. Keep the brand tone professional yet approachable
5. Focus on employee stories and workplace culture
6. Duration must match the requested length

Output your response in this exact JSON format:
{
  "script_text": "The complete script with scene markers [SCENE 1] etc.",
  "shooting_guide": {
    "scenes": [
      {
        "scene_number": 1,
        "description": "Description of what happens in this scene",
        "duration_seconds": 10,
        "camera_angle": "e.g., front-facing, over-shoulder",
        "notes": "Special instructions"
      }
    ],
    "location": "Recommended filming location",
    "props": ["List of needed props"],
    "total_duration_seconds": 60,
    "tips": ["Filming tips"]
  }
}`;

export async function generateVideoScript(input: ScriptInput): Promise<ScriptOutput> {
  const userPrompt = `
以下の要件で動画台本と撮影ガイドを作成してください:

タイトル: ${input.title}
ターゲット層: ${input.target_audience}
ブランド: ${input.brand}
キーメッセージ:
${input.key_messages.map((m) => `- ${m}`).join("\n")}
動画の長さ: ${input.duration_seconds}秒
プラットフォーム: ${input.platform}
${input.store_name ? `店舗名: ${input.store_name}` : ""}
${input.brand_values ? `ブランドバリュー: ${input.brand_values}` : ""}

${input.platform === "tiktok" || input.platform === "instagram"
    ? "※ 縦型動画（9:16）を想定してください"
    : "※ 横型動画（16:9）を想定してください"
  }
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in AI response");
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as ScriptOutput;

    // Validate shooting guide structure
    if (!parsed.shooting_guide?.scenes || !Array.isArray(parsed.shooting_guide.scenes)) {
      parsed.shooting_guide = {
        scenes: [{
          scene_number: 1,
          description: "メインシーン",
          duration_seconds: input.duration_seconds,
          camera_angle: "正面",
          notes: "",
        }],
        location: "店舗",
        props: [],
        total_duration_seconds: input.duration_seconds,
        tips: ["自然光を活用してください"],
      };
    }

    return parsed;
  } catch (error) {
    console.error("Script generation error:", error);

    // Return a default script on error
    return {
      script_text: `[SCENE 1]\n${input.title}\n\n（AIスクリプト生成に失敗しました。手動で台本を作成してください。）`,
      shooting_guide: {
        scenes: [{
          scene_number: 1,
          description: input.title,
          duration_seconds: input.duration_seconds,
          camera_angle: "正面",
          notes: "手動で撮影プランを作成してください",
        }],
        location: "店舗内",
        props: [],
        total_duration_seconds: input.duration_seconds,
        tips: ["撮影前にテスト撮影を行い、音声と映像の品質を確認してください"],
      },
    };
  }
}
