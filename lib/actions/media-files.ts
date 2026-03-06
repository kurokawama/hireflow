"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type { MediaFile, MediaFileType } from "@/types/video";

// Create a media file record
export async function createMediaFile(params: {
  file_name: string;
  file_type: MediaFileType;
  file_size: number;
  mime_type: string;
  storage_path: string;
  thumbnail_path?: string;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
}): Promise<MediaFile | null> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("media_files")
    .insert({
      org_id: authUser.member.org_id,
      file_name: params.file_name,
      file_type: params.file_type,
      file_size: params.file_size,
      mime_type: params.mime_type,
      storage_path: params.storage_path,
      thumbnail_path: params.thumbnail_path || null,
      duration_seconds: params.duration_seconds || null,
      metadata: params.metadata || {},
      uploaded_by: authUser.userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating media file:", error);
    return null;
  }

  return data;
}

// Get a media file
export async function getMediaFile(fileId: string): Promise<MediaFile | null> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("media_files")
    .select("*")
    .eq("id", fileId)
    .eq("org_id", authUser.member.org_id)
    .single();

  if (error) return null;
  return data;
}

// List media files by type
export async function listMediaFiles(params?: {
  file_type?: MediaFileType;
  limit?: number;
}): Promise<MediaFile[]> {
  const authUser = await requireAuth(["admin", "hq_staff", "store_manager"]);
  const supabase = createAdminClient();

  let query = supabase
    .from("media_files")
    .select("*")
    .eq("org_id", authUser.member.org_id)
    .order("created_at", { ascending: false })
    .limit(params?.limit || 50);

  if (params?.file_type) {
    query = query.eq("file_type", params.file_type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listing media files:", error);
    return [];
  }

  return data || [];
}

// Delete a media file record (does NOT delete from storage)
export async function deleteMediaFile(fileId: string): Promise<boolean> {
  const authUser = await requireAuth(["admin", "hq_staff"]);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("media_files")
    .delete()
    .eq("id", fileId)
    .eq("org_id", authUser.member.org_id);

  if (error) {
    console.error("Error deleting media file:", error);
    return false;
  }

  return true;
}
