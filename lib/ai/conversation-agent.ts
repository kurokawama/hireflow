import Anthropic from "@anthropic-ai/sdk";
import type { GeneratedContent, Profile, Store } from "@/types/database";
import type { ConversationMessage, AIConversationResponse } from "@/types/conversation";

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

interface ConversationContext {
  content: GeneratedContent;
  profile: Profile;
  store: Store;
  messages: ConversationMessage[];
}

const SYSTEM_PROMPT = `You are an AI content revision assistant for a Japanese recruitment platform.
Your role is to help HR staff refine AI-generated recruitment content through conversation.

RULES:
1. Always respond in Japanese
2. When the user requests a change, provide both a conversational response AND a revised version
3. Keep the brand tone and compliance rules intact
4. Never fabricate facts not in the original content or context
5. Must_include items must remain in all revisions
6. NG words must never appear in revisions

When you propose a revision, output your response in this exact JSON format:
{
  "message": "Your conversational response explaining the changes",
  "revised_body_text": "The complete revised content text",
  "revised_parts_json": { ... optional structured parts ... }
}

When you are just having a conversation (no revision needed), respond with:
{
  "message": "Your conversational response"
}

Always output valid JSON. No text outside the JSON object.`;

function buildSystemPrompt(context: ConversationContext): string {
  const { profile, store, content } = context;

  return `${SYSTEM_PROMPT}

## Brand Context
- Brand: ${profile.brand_name}
- Tone: ${profile.tone}
- Must include: ${profile.must_include.join(", ")}
- NG words: ${profile.ng_words.join(", ")}
${profile.compliance_note ? `- Compliance: ${profile.compliance_note}` : ""}

## Store Context
- Store: ${store.store_name}
- Location: ${store.location_text}

## Content Being Edited
- Platform: ${content.platform}
- Current version: ${content.version}
- Current body text:
${content.body_text}`;
}

function buildMessages(
  context: ConversationContext
): Anthropic.MessageParam[] {
  const { messages } = context;

  // Take the most recent 20 messages to avoid token limits
  const recentMessages = messages.slice(-20);

  return recentMessages.map((msg) => ({
    role: msg.role === "human" ? ("user" as const) : ("assistant" as const),
    content:
      msg.role === "ai" && msg.revised_body_text
        ? JSON.stringify({
            message: msg.content,
            revised_body_text: msg.revised_body_text,
            revised_parts_json: msg.revised_parts_json,
          })
        : msg.role === "ai"
          ? JSON.stringify({ message: msg.content })
          : msg.content,
  }));
}

export async function conversationChat(
  context: ConversationContext,
  userMessage: string
): Promise<AIConversationResponse> {
  const systemPrompt = buildSystemPrompt(context);
  const previousMessages = buildMessages(context);

  // Add the new user message
  const allMessages: Anthropic.MessageParam[] = [
    ...previousMessages,
    { role: "user", content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: allMessages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude API");
  }

  // Parse the JSON response
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Fallback: treat the entire response as a message
    return { message: textBlock.text };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      message: parsed.message || textBlock.text,
      revised_body_text: parsed.revised_body_text || undefined,
      revised_parts_json: parsed.revised_parts_json || undefined,
    };
  } catch {
    // JSON parse failed, return as plain message
    return { message: textBlock.text };
  }
}
