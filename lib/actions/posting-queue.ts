"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type { PostingQueue, PostingLog, PostingQueueWithContent, SNSPlatform } from "@/types/sns";

// List posting queue items with content info
export async function listPostingQueue(params?: {
  status?: string;
  platform?: SNSPlatform;
  limit?: number;
}): Promise<PostingQueueWithContent[]> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  let query = supabase
    .from("posting_queue")
    .select(`
      *,
      content:generated_contents!content_id(id, body_text, platform, status),
      connection:sns_connections!connection_id(id, platform, external_account_name)
    `)
    .eq("org_id", authUser.member.org_id)
    .order("created_at", { ascending: false })
    .limit(params?.limit || 50);

  if (params?.status) {
    query = query.eq("status", params.status);
  }
  if (params?.platform) {
    query = query.eq("platform", params.platform);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listing posting queue:", error);
    return [];
  }

  return (data || []) as PostingQueueWithContent[];
}

// Schedule a new post
export async function schedulePost(params: {
  content_id: string;
  connection_id: string;
  platform: SNSPlatform;
  scheduled_at?: string | null;
  media_urls?: string[];
}): Promise<PostingQueue | null> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  // Verify content exists and is approved
  const { data: content } = await supabase
    .from("generated_contents")
    .select("id, status")
    .eq("id", params.content_id)
    .eq("org_id", authUser.member.org_id)
    .single();

  if (!content) {
    throw new Error("Content not found");
  }

  if (content.status !== "approved") {
    throw new Error("Content must be approved before posting");
  }

  // Verify connection exists and is active
  const { data: connection } = await supabase
    .from("sns_connections")
    .select("id, status")
    .eq("id", params.connection_id)
    .eq("org_id", authUser.member.org_id)
    .single();

  if (!connection || connection.status !== "active") {
    throw new Error("SNS connection not found or inactive");
  }

  const { data, error } = await supabase
    .from("posting_queue")
    .insert({
      org_id: authUser.member.org_id,
      content_id: params.content_id,
      connection_id: params.connection_id,
      platform: params.platform,
      scheduled_at: params.scheduled_at || null,
      status: "pending",
      approved_by: authUser.userId,
      approved_at: new Date().toISOString(),
      media_urls: params.media_urls || [],
    })
    .select()
    .single();

  if (error) {
    console.error("Error scheduling post:", error);
    return null;
  }

  return data;
}

// Cancel a pending post
export async function cancelPost(queueId: string): Promise<boolean> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("posting_queue")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", queueId)
    .eq("org_id", authUser.member.org_id)
    .in("status", ["pending"]); // Can only cancel pending

  if (error) {
    console.error("Error cancelling post:", error);
    return false;
  }

  return true;
}

// List posting logs (audit trail)
export async function listPostingLogs(params?: {
  content_id?: string;
  queue_id?: string;
  platform?: SNSPlatform;
  limit?: number;
}): Promise<PostingLog[]> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  let query = supabase
    .from("posting_logs")
    .select("*")
    .eq("org_id", authUser.member.org_id)
    .order("created_at", { ascending: false })
    .limit(params?.limit || 50);

  if (params?.content_id) {
    query = query.eq("content_id", params.content_id);
  }
  if (params?.queue_id) {
    query = query.eq("queue_id", params.queue_id);
  }
  if (params?.platform) {
    query = query.eq("platform", params.platform);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listing posting logs:", error);
    return [];
  }

  return data || [];
}

// Get queue stats for dashboard
export async function getPostingStats(): Promise<{
  pending: number;
  processing: number;
  posted: number;
  failed: number;
  total: number;
}> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("posting_queue")
    .select("status")
    .eq("org_id", authUser.member.org_id);

  if (error || !data) {
    return { pending: 0, processing: 0, posted: 0, failed: 0, total: 0 };
  }

  const stats = {
    pending: 0,
    processing: 0,
    posted: 0,
    failed: 0,
    total: data.length,
  };

  for (const item of data) {
    if (item.status in stats) {
      stats[item.status as keyof typeof stats]++;
    }
  }

  return stats;
}
