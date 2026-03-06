"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type { AIEditJob, AIEditInputConfig } from "@/types/ai-edit";

// List AI edit jobs for a project
export async function listAIEditJobs(projectId: string): Promise<AIEditJob[]> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_edit_jobs")
    .select("*")
    .eq("video_project_id", projectId)
    .eq("org_id", authUser.member.org_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing AI edit jobs:", error);
    return [];
  }

  return data || [];
}

// Create an AI edit job
export async function createAIEditJob(params: {
  video_project_id: string;
  provider?: string;
  input_config: AIEditInputConfig;
}): Promise<AIEditJob | null> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_edit_jobs")
    .insert({
      org_id: authUser.member.org_id,
      video_project_id: params.video_project_id,
      provider: params.provider || "runway",
      input_config: params.input_config,
      status: "pending",
      created_by: authUser.userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating AI edit job:", error);
    return null;
  }

  return data;
}

// Update AI edit job status
export async function updateAIEditJob(
  jobId: string,
  updates: Partial<Pick<AIEditJob, "status" | "output_media_id" | "cost_usd" | "error_message" | "processing_time_seconds">>
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("ai_edit_jobs")
    .update(updates)
    .eq("id", jobId);

  if (error) {
    console.error("Error updating AI edit job:", error);
    return false;
  }

  return true;
}
