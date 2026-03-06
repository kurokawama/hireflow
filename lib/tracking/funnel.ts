// Funnel analytics calculations
import { createAdminClient } from "@/lib/supabase/admin";
import type { FunnelSummary, FunnelStep } from "@/types/tracking";

const FUNNEL_ORDER: FunnelStep[] = [
  "impression",
  "click",
  "quiz_start",
  "quiz_complete",
  "line_follow",
  "interview_book",
];

// Get funnel summary for an organization
export async function getFunnelSummary(
  orgId: string,
  days: number = 30
): Promise<FunnelSummary> {
  const supabase = createAdminClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from("entry_tracking")
    .select("funnel_step")
    .eq("org_id", orgId)
    .gte("created_at", cutoffDate.toISOString());

  if (error || !data) {
    return {
      impression: 0,
      click: 0,
      quiz_start: 0,
      quiz_complete: 0,
      line_follow: 0,
      interview_book: 0,
      conversion_rate: 0,
    };
  }

  const counts: Record<string, number> = {};
  for (const step of FUNNEL_ORDER) {
    counts[step] = 0;
  }

  for (const item of data) {
    if (item.funnel_step in counts) {
      counts[item.funnel_step]++;
    }
  }

  const impressions = counts.impression || 1; // Avoid division by zero
  const interviews = counts.interview_book || 0;

  return {
    impression: counts.impression,
    click: counts.click,
    quiz_start: counts.quiz_start,
    quiz_complete: counts.quiz_complete,
    line_follow: counts.line_follow,
    interview_book: counts.interview_book,
    conversion_rate: Math.round((interviews / impressions) * 10000) / 100,
  };
}

// Track a funnel event
export async function trackFunnelEvent(params: {
  org_id: string;
  funnel_step: FunnelStep;
  entry_source: string;
  referral_platform?: string;
  candidate_id?: string;
  posting_queue_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("entry_tracking").insert({
    org_id: params.org_id,
    funnel_step: params.funnel_step,
    entry_source: params.entry_source,
    referral_platform: params.referral_platform || null,
    candidate_id: params.candidate_id || null,
    posting_queue_id: params.posting_queue_id || null,
    metadata: params.metadata || {},
  });

  if (error) {
    console.error("Track funnel event error:", error);
    return false;
  }

  return true;
}
