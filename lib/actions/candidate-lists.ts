"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type { CandidateList, CandidateListMember } from "@/types/quiz";
import type { CreateListRequest, UpdateListRequest } from "@/types/quiz-dto";

export async function getLists(): Promise<
  Array<CandidateList & { member_count: number }>
> {
  const { member } = await requireAuth();
  const supabase = createAdminClient();

  // Get lists with member count
  const { data: lists, error } = await supabase
    .from("candidate_lists")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Get member counts
  const listIds = (lists || []).map((l) => l.id);
  if (listIds.length === 0) return [];

  const { data: counts } = await supabase
    .from("candidate_list_members")
    .select("list_id")
    .in("list_id", listIds);

  const countMap = new Map<string, number>();
  for (const row of counts || []) {
    countMap.set(row.list_id, (countMap.get(row.list_id) || 0) + 1);
  }

  return (lists || []).map((list) => ({
    ...list,
    member_count: countMap.get(list.id) || 0,
  }));
}

export async function getList(
  listId: string
): Promise<CandidateList | null> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("candidate_lists")
    .select("*")
    .eq("id", listId)
    .single();

  if (error) return null;
  return data;
}

export async function createList(
  input: CreateListRequest
): Promise<CandidateList> {
  const { member, userId } = await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("candidate_lists")
    .insert({
      org_id: member.org_id,
      name: input.name,
      brand: input.brand || null,
      purpose: input.purpose || null,
      description: input.description || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateList(
  listId: string,
  input: UpdateListRequest
): Promise<CandidateList> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("candidate_lists")
    .update(input)
    .eq("id", listId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteList(listId: string): Promise<void> {
  await requireAuth();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("candidate_lists")
    .delete()
    .eq("id", listId);

  if (error) throw new Error(error.message);
}

export async function getListMembers(
  listId: string
): Promise<Array<CandidateListMember & { candidate: { id: string; name: string | null; ai_score: number; stage: string } }>> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("candidate_list_members")
    .select(`
      *,
      candidate:candidates (id, name, ai_score, stage)
    `)
    .eq("list_id", listId)
    .order("added_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as Array<CandidateListMember & { candidate: { id: string; name: string | null; ai_score: number; stage: string } }>;
}

export async function addCandidateToList(
  listId: string,
  candidateId: string
): Promise<CandidateListMember> {
  const { userId } = await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("candidate_list_members")
    .insert({
      list_id: listId,
      candidate_id: candidateId,
      added_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function removeCandidateFromList(
  listId: string,
  candidateId: string
): Promise<void> {
  await requireAuth();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("candidate_list_members")
    .delete()
    .eq("list_id", listId)
    .eq("candidate_id", candidateId);

  if (error) throw new Error(error.message);
}
