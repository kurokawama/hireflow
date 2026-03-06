"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type { SNSConnection, SNSPlatform } from "@/types/sns";

// List all SNS connections for the org
export async function listSNSConnections(): Promise<SNSConnection[]> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sns_connections")
    .select("*")
    .eq("org_id", authUser.member.org_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing SNS connections:", error);
    return [];
  }

  return data || [];
}

// Get a single connection
export async function getSNSConnection(connectionId: string): Promise<SNSConnection | null> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sns_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("org_id", authUser.member.org_id)
    .single();

  if (error) return null;
  return data;
}

// Create a new SNS connection (after OAuth callback)
export async function createSNSConnection(params: {
  platform: SNSPlatform;
  access_token: string;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  external_account_id?: string | null;
  external_account_name?: string | null;
  account_metadata?: Record<string, unknown>;
}): Promise<SNSConnection | null> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  // Check if a connection already exists for this platform + account
  if (params.external_account_id) {
    const { data: existing } = await supabase
      .from("sns_connections")
      .select("id")
      .eq("org_id", authUser.member.org_id)
      .eq("platform", params.platform)
      .eq("external_account_id", params.external_account_id)
      .single();

    if (existing) {
      // Update existing connection
      const { data: updated, error } = await supabase
        .from("sns_connections")
        .update({
          access_token: params.access_token,
          refresh_token: params.refresh_token ?? null,
          token_expires_at: params.token_expires_at ?? null,
          external_account_name: params.external_account_name ?? null,
          account_metadata: params.account_metadata || {},
          status: "active",
          connected_by: authUser.userId,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating SNS connection:", error);
        return null;
      }
      return updated;
    }
  }

  // Create new connection
  const { data, error } = await supabase
    .from("sns_connections")
    .insert({
      org_id: authUser.member.org_id,
      platform: params.platform,
      access_token: params.access_token,
      refresh_token: params.refresh_token ?? null,
      token_expires_at: params.token_expires_at ?? null,
      external_account_id: params.external_account_id ?? null,
      external_account_name: params.external_account_name ?? null,
      account_metadata: params.account_metadata || {},
      status: "active",
      connected_by: authUser.userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating SNS connection:", error);
    return null;
  }

  return data;
}

// Disconnect (revoke) a connection
export async function revokeSNSConnection(connectionId: string): Promise<boolean> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("sns_connections")
    .update({ status: "revoked" })
    .eq("id", connectionId)
    .eq("org_id", authUser.member.org_id);

  if (error) {
    console.error("Error revoking SNS connection:", error);
    return false;
  }

  return true;
}

// Delete a connection entirely
export async function deleteSNSConnection(connectionId: string): Promise<boolean> {
  const authUser = await requireAuth(["admin"]);
  const supabase = createAdminClient();

  // Check no pending posts use this connection
  const { data: pendingPosts } = await supabase
    .from("posting_queue")
    .select("id")
    .eq("connection_id", connectionId)
    .in("status", ["pending", "processing"])
    .limit(1);

  if (pendingPosts && pendingPosts.length > 0) {
    throw new Error("Cannot delete connection with pending posts");
  }

  const { error } = await supabase
    .from("sns_connections")
    .delete()
    .eq("id", connectionId)
    .eq("org_id", authUser.member.org_id);

  if (error) {
    console.error("Error deleting SNS connection:", error);
    return false;
  }

  return true;
}

// Create a mock connection for testing (when no API keys)
export async function createMockConnection(
  platform: SNSPlatform,
  accountName: string
): Promise<SNSConnection | null> {
  return createSNSConnection({
    platform,
    access_token: `mock_token_${platform}_${Date.now()}`,
    refresh_token: null,
    token_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    external_account_id: `mock_${platform}_${Date.now()}`,
    external_account_name: accountName,
    account_metadata: { mock: true },
  });
}
