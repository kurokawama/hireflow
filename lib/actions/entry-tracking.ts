"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import { getFunnelSummary } from "@/lib/tracking/funnel";
import type { EntryTracking, FunnelSummary } from "@/types/tracking";

// List entry tracking events
export async function listEntryEvents(params?: {
  funnel_step?: string;
  entry_source?: string;
  limit?: number;
}): Promise<EntryTracking[]> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  let query = supabase
    .from("entry_tracking")
    .select("*")
    .eq("org_id", authUser.member.org_id)
    .order("created_at", { ascending: false })
    .limit(params?.limit || 100);

  if (params?.funnel_step) {
    query = query.eq("funnel_step", params.funnel_step);
  }
  if (params?.entry_source) {
    query = query.eq("entry_source", params.entry_source);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listing entry events:", error);
    return [];
  }

  return data || [];
}

// Get funnel summary
export async function getOrgFunnelSummary(days?: number): Promise<FunnelSummary> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  return getFunnelSummary(authUser.member.org_id, days || 30);
}
