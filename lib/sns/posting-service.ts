// Posting service: handles queue processing, retries, and logging
import { createAdminClient } from "@/lib/supabase/admin";
import { createSNSClient } from "./client-factory";
import type { PostingQueue, SNSPlatform, PostingLogAction } from "@/types/sns";

// Process a single posting queue item
export async function processPostingQueueItem(queueItem: PostingQueue): Promise<{
  success: boolean;
  external_post_id?: string;
  error?: string;
}> {
  const supabase = createAdminClient();

  // Update status to processing
  await supabase
    .from("posting_queue")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", queueItem.id);

  // Log attempt
  await logPostingAction(queueItem, "attempted");

  // Get connection details
  const { data: connection } = await supabase
    .from("sns_connections")
    .select("*")
    .eq("id", queueItem.connection_id)
    .single();

  if (!connection) {
    const error = "SNS connection not found";
    await updateQueueFailed(queueItem.id, error);
    await logPostingAction(queueItem, "failed", undefined, error);
    return { success: false, error };
  }

  // Get content
  const { data: content } = await supabase
    .from("generated_contents")
    .select("body_text, media_urls")
    .eq("id", queueItem.content_id)
    .single();

  if (!content) {
    const error = "Content not found";
    await updateQueueFailed(queueItem.id, error);
    await logPostingAction(queueItem, "failed", undefined, error);
    return { success: false, error };
  }

  // Create SNS client and post
  const client = createSNSClient(queueItem.platform as SNSPlatform, {
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    account_metadata: connection.account_metadata,
  });

  const result = await client.post({
    text: content.body_text,
    media_urls: queueItem.media_urls || content.media_urls || [],
  });

  if (result.success) {
    // Success — update queue
    await supabase
      .from("posting_queue")
      .update({
        status: "posted",
        external_post_id: result.external_post_id || null,
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueItem.id);

    await logPostingAction(
      queueItem,
      "succeeded",
      result.external_post_id,
      undefined,
      result.response_data
    );

    return { success: true, external_post_id: result.external_post_id };
  } else {
    // Failed — check retry
    const newRetryCount = queueItem.retry_count + 1;
    if (newRetryCount < queueItem.max_retries) {
      // Retry later
      await supabase
        .from("posting_queue")
        .update({
          status: "pending",
          retry_count: newRetryCount,
          error_message: result.error || "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueItem.id);

      await logPostingAction(queueItem, "retried", undefined, result.error);
    } else {
      // Max retries reached
      await updateQueueFailed(queueItem.id, result.error || "Max retries exceeded");
      await logPostingAction(queueItem, "failed", undefined, result.error);
    }

    return { success: false, error: result.error };
  }
}

// Process all pending items in the queue
export async function processAllPendingPosts(orgId: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const supabase = createAdminClient();

  // Get all pending items (immediate posts or scheduled posts whose time has come)
  const { data: pendingItems } = await supabase
    .from("posting_queue")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .or("scheduled_at.is.null,scheduled_at.lte." + new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(10);

  if (!pendingItems || pendingItems.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const item of pendingItems) {
    const result = await processPostingQueueItem(item);
    if (result.success) succeeded++;
    else failed++;
  }

  return { processed: pendingItems.length, succeeded, failed };
}

// Helper: Update queue item to failed
async function updateQueueFailed(queueId: string, error: string) {
  const supabase = createAdminClient();
  await supabase
    .from("posting_queue")
    .update({
      status: "failed",
      error_message: error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", queueId);
}

// Helper: Log posting action
async function logPostingAction(
  queueItem: PostingQueue,
  action: PostingLogAction,
  externalPostId?: string,
  errorDetails?: string,
  responseData?: Record<string, unknown>
) {
  const supabase = createAdminClient();
  await supabase.from("posting_logs").insert({
    org_id: queueItem.org_id,
    queue_id: queueItem.id,
    content_id: queueItem.content_id,
    platform: queueItem.platform,
    action,
    external_post_id: externalPostId || null,
    response_data: responseData || {},
    error_details: errorDetails || null,
  });
}
