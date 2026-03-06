"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type { VideoProject, VideoProjectWithMedia, VideoProjectStatus } from "@/types/video";

// List all video projects for the org
export async function listVideoProjects(params?: {
  status?: VideoProjectStatus;
  limit?: number;
}): Promise<VideoProjectWithMedia[]> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  let query = supabase
    .from("video_projects")
    .select(`
      *,
      raw_video:media_files!raw_video_id(*),
      edited_video:media_files!edited_video_id(*)
    `)
    .eq("org_id", authUser.member.org_id)
    .order("created_at", { ascending: false })
    .limit(params?.limit || 50);

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listing video projects:", error);
    return [];
  }

  return (data || []) as VideoProjectWithMedia[];
}

// Get a single video project with media
export async function getVideoProject(projectId: string): Promise<VideoProjectWithMedia | null> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("video_projects")
    .select(`
      *,
      raw_video:media_files!raw_video_id(*),
      edited_video:media_files!edited_video_id(*)
    `)
    .eq("id", projectId)
    .eq("org_id", authUser.member.org_id)
    .single();

  if (error) return null;
  return data as VideoProjectWithMedia;
}

// Create a new video project
export async function createVideoProject(params: {
  title: string;
  content_id?: string;
  script_text?: string;
  shooting_guide?: Record<string, unknown>;
}): Promise<VideoProject | null> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("video_projects")
    .insert({
      org_id: authUser.member.org_id,
      title: params.title,
      content_id: params.content_id || null,
      script_text: params.script_text || null,
      shooting_guide: params.shooting_guide || {},
      status: params.script_text ? "script" : "script",
      created_by: authUser.userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating video project:", error);
    return null;
  }

  return data;
}

// Update a video project
export async function updateVideoProject(
  projectId: string,
  updates: Partial<Pick<VideoProject, "title" | "script_text" | "shooting_guide" | "edit_config" | "subtitle_text" | "status" | "raw_video_id" | "edited_video_id">>
): Promise<VideoProject | null> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("video_projects")
    .update(updates)
    .eq("id", projectId)
    .eq("org_id", authUser.member.org_id)
    .select()
    .single();

  if (error) {
    console.error("Error updating video project:", error);
    return null;
  }

  return data;
}

// Delete a video project
export async function deleteVideoProject(projectId: string): Promise<boolean> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("video_projects")
    .delete()
    .eq("id", projectId)
    .eq("org_id", authUser.member.org_id);

  if (error) {
    console.error("Error deleting video project:", error);
    return false;
  }

  return true;
}
