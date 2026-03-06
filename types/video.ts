// Video workflow types — matches Supabase schema

export type VideoProjectStatus =
  | "script"
  | "shooting"
  | "uploaded"
  | "editing"
  | "edited"
  | "approved";

export type MediaFileType = "image" | "video" | "audio";

export interface MediaFile {
  id: string;
  org_id: string;
  file_name: string;
  file_type: MediaFileType;
  file_size: number;
  mime_type: string;
  storage_path: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
  uploaded_by: string | null;
  created_at: string;
}

export interface ShootingGuide {
  scenes: Array<{
    scene_number: number;
    description: string;
    duration_seconds: number;
    camera_angle: string;
    notes: string;
  }>;
  location: string;
  props: string[];
  total_duration_seconds: number;
  tips: string[];
}

export interface EditConfig {
  trim_start?: number; // seconds
  trim_end?: number; // seconds
  subtitle_enabled?: boolean;
  bgm_track?: string;
  bgm_volume?: number; // 0-100
  filters?: string[];
  text_overlays?: Array<{
    text: string;
    position: "top" | "center" | "bottom";
    start_time: number;
    end_time: number;
  }>;
}

export interface VideoProject {
  id: string;
  org_id: string;
  content_id: string | null;
  title: string;
  script_text: string | null;
  shooting_guide: ShootingGuide;
  raw_video_id: string | null;
  edited_video_id: string | null;
  edit_config: EditConfig;
  subtitle_text: string | null;
  status: VideoProjectStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Extended type with media file references
export interface VideoProjectWithMedia extends VideoProject {
  raw_video?: MediaFile | null;
  edited_video?: MediaFile | null;
}

// API request types
export interface ScriptGenerateRequest {
  title: string;
  target_audience: string;
  brand: string;
  key_messages: string[];
  duration_seconds: number; // target video duration
  platform: string; // target SNS platform
  store_id?: string;
}

export interface ScriptGenerateResponse {
  script_text: string;
  shooting_guide: ShootingGuide;
  project_id: string;
}

export interface VideoUploadResponse {
  media_file_id: string;
  storage_path: string;
  duration_seconds: number | null;
  file_size: number;
}
