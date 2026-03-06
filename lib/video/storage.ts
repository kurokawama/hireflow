// Supabase Storage operations for video files
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET_NAME = "video-uploads";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface UploadResult {
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

// Upload a video file to Supabase Storage
export async function uploadVideoFile(
  orgId: string,
  file: File | Buffer,
  fileName: string,
  mimeType: string = "video/mp4"
): Promise<UploadResult> {
  const supabase = createAdminClient();

  // Validate file size
  const fileSize = file instanceof File ? file.size : file.length;
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Generate unique path: org_id/timestamp_filename
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${orgId}/${timestamp}_${sanitizedName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  return {
    storage_path: storagePath,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
  };
}

// Get a signed URL for a file (temporary access)
export async function getSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    console.error("Signed URL error:", error);
    return null;
  }

  return data.signedUrl;
}

// Delete a file from storage
export async function deleteVideoFile(storagePath: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    console.error("Storage delete error:", error);
    return false;
  }

  return true;
}

// List files in a directory
export async function listOrgFiles(
  orgId: string,
  options?: { limit?: number; offset?: number }
): Promise<Array<{ name: string; size: number; created_at: string }>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(orgId, {
      limit: options?.limit || 100,
      offset: options?.offset || 0,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    console.error("Storage list error:", error);
    return [];
  }

  return (data || []).map((file) => ({
    name: file.name,
    size: file.metadata?.size || 0,
    created_at: file.created_at || "",
  }));
}
