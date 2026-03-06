// LINE Webhook event handler
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeMessage } from "./messaging";

export interface LineWebhookEvent {
  type: string;
  source: {
    type: string;
    userId: string;
  };
  timestamp: number;
  message?: {
    type: string;
    text?: string;
  };
  replyToken?: string;
}

export interface LineWebhookBody {
  events: LineWebhookEvent[];
  destination: string;
}

// Process LINE webhook events
export async function processWebhookEvents(
  body: LineWebhookBody,
  orgId: string
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  for (const event of body.events) {
    try {
      switch (event.type) {
        case "follow":
          await handleFollowEvent(event, orgId);
          processed++;
          break;

        case "unfollow":
          await handleUnfollowEvent(event, orgId);
          processed++;
          break;

        case "message":
          // Log message receipt but don't auto-reply
          processed++;
          break;

        default:
          // Ignore other event types
          break;
      }
    } catch (error) {
      errors.push(
        `Event ${event.type}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return { processed, errors };
}

// Handle new follower
async function handleFollowEvent(event: LineWebhookEvent, orgId: string) {
  const supabase = createAdminClient();
  const lineUserId = event.source.userId;

  // Check if candidate exists with this LINE user ID
  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("org_id", orgId)
    .eq("line_user_id", lineUserId)
    .single();

  if (candidate) {
    // Update existing candidate
    await supabase
      .from("candidates")
      .update({
        line_follow_at: new Date().toISOString(),
        stage: "line_followed",
      })
      .eq("id", candidate.id);
  } else {
    // Create new candidate from LINE follow
    await supabase.from("candidates").insert({
      org_id: orgId,
      source_channel: "line",
      line_user_id: lineUserId,
      stage: "line_followed",
      line_follow_at: new Date().toISOString(),
      quiz_answers: {},
      ai_score: 0,
      score_factors: {},
    });
  }

  // Track funnel event
  await supabase.from("entry_tracking").insert({
    org_id: orgId,
    candidate_id: candidate?.id || null,
    entry_source: "direct",
    referral_platform: "line",
    funnel_step: "line_follow",
    metadata: { line_user_id: lineUserId },
  });

  // Send welcome message
  const { data: settings } = await supabase
    .from("line_settings")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .single();

  if (settings) {
    await sendWelcomeMessage(
      lineUserId,
      settings.welcome_message,
      settings.interview_booking_url || undefined
    );
  }
}

// Handle unfollow
async function handleUnfollowEvent(event: LineWebhookEvent, orgId: string) {
  const supabase = createAdminClient();
  const lineUserId = event.source.userId;

  // Update candidate status
  await supabase
    .from("candidates")
    .update({ notes: "LINE unfollowed" })
    .eq("org_id", orgId)
    .eq("line_user_id", lineUserId);
}
