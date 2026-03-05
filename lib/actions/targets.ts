"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type {
  TargetList,
  TargetProfile,
  CreateTargetListRequest,
  CreateTargetProfileRequest,
  UpdateTargetProfileRequest,
} from "@/types/targets";

// ============================================================
// Target Lists
// ============================================================

export async function getTargetLists(): Promise<TargetList[]> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("target_lists")
    .select("*")
    .eq("org_id", authUser.member.org_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as TargetList[];
}

export async function getTargetList(id: string): Promise<TargetList | null> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("target_lists")
    .select("*")
    .eq("id", id)
    .eq("org_id", authUser.member.org_id)
    .single();

  if (error) return null;
  return data as TargetList;
}

export async function createTargetList(
  input: CreateTargetListRequest
): Promise<TargetList> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("target_lists")
    .insert({
      org_id: authUser.member.org_id,
      name: input.name,
      description: input.description || null,
      brand: input.brand || null,
      keywords: input.keywords || [],
      platform_filter: input.platform_filter || [],
      created_by: authUser.userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TargetList;
}

export async function updateTargetList(
  id: string,
  input: Partial<CreateTargetListRequest>
): Promise<TargetList> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("target_lists")
    .update(input)
    .eq("id", id)
    .eq("org_id", authUser.member.org_id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TargetList;
}

export async function deleteTargetList(id: string): Promise<void> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("target_lists")
    .delete()
    .eq("id", id)
    .eq("org_id", authUser.member.org_id);

  if (error) throw new Error(error.message);
}

// ============================================================
// Target Profiles
// ============================================================

export async function getTargetProfiles(
  listId: string
): Promise<TargetProfile[]> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("target_profiles")
    .select("*")
    .eq("list_id", listId)
    .eq("org_id", authUser.member.org_id)
    .order("ai_score", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as TargetProfile[];
}

export async function createTargetProfile(
  input: CreateTargetProfileRequest
): Promise<TargetProfile> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  // Verify list belongs to same org
  const { data: list } = await supabase
    .from("target_lists")
    .select("org_id")
    .eq("id", input.list_id)
    .single();

  if (!list || list.org_id !== authUser.member.org_id) {
    throw new Error("Target list not found");
  }

  const { data, error } = await supabase
    .from("target_profiles")
    .insert({
      org_id: authUser.member.org_id,
      list_id: input.list_id,
      platform: input.platform,
      profile_url: input.profile_url || null,
      username: input.username || null,
      display_name: input.display_name || null,
      bio: input.bio || null,
      follower_count: input.follower_count || null,
      interest_tags: input.interest_tags || [],
      persona_category: input.persona_category || "potential_applicant",
      source: input.source || "manual",
      notes: input.notes || null,
      created_by: authUser.userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TargetProfile;
}

export async function updateTargetProfile(
  id: string,
  input: UpdateTargetProfileRequest
): Promise<TargetProfile> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("target_profiles")
    .update(input)
    .eq("id", id)
    .eq("org_id", authUser.member.org_id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TargetProfile;
}

export async function deleteTargetProfile(id: string): Promise<void> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("target_profiles")
    .delete()
    .eq("id", id)
    .eq("org_id", authUser.member.org_id);

  if (error) throw new Error(error.message);
}
