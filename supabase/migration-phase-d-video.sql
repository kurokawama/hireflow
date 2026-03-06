-- Phase D: Video Workflow — Script Generation + Upload + Basic Editing
-- Tables: media_files, video_projects
-- Storage bucket: video-uploads

-- ============================================================
-- Media Files (generic file storage references)
-- ============================================================
CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'video', -- 'image' | 'video' | 'audio'
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'video/mp4',
  storage_path TEXT NOT NULL, -- Supabase Storage path
  thumbnail_path TEXT, -- Optional thumbnail
  duration_seconds INT, -- For video/audio
  metadata JSONB NOT NULL DEFAULT '{}', -- width, height, codec, etc.
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_files_select" ON media_files
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "media_files_insert" ON media_files
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "media_files_delete" ON media_files
  FOR DELETE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE media_files IS 'Generic media file references for Supabase Storage objects';

-- ============================================================
-- Video Projects (full video workflow)
-- ============================================================
CREATE TABLE IF NOT EXISTS video_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  content_id UUID REFERENCES generated_contents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  script_text TEXT, -- AI-generated script
  shooting_guide JSONB NOT NULL DEFAULT '{}', -- {scenes, camera_angles, props, location, duration}
  raw_video_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
  edited_video_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
  edit_config JSONB NOT NULL DEFAULT '{}', -- {trim_start, trim_end, subtitle, bgm, filters}
  subtitle_text TEXT, -- SRT or plain text subtitles
  status TEXT NOT NULL DEFAULT 'script', -- 'script' | 'shooting' | 'uploaded' | 'editing' | 'edited' | 'approved'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_projects_select" ON video_projects
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "video_projects_insert" ON video_projects
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "video_projects_update" ON video_projects
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "video_projects_delete" ON video_projects
  FOR DELETE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE video_projects IS 'Video workflow: AI script → shoot → upload → edit → approve';

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_media_files_org ON media_files(org_id);
CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_video_projects_org ON video_projects(org_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_status ON video_projects(status);
CREATE INDEX IF NOT EXISTS idx_video_projects_content ON video_projects(content_id);

-- ============================================================
-- Updated_at trigger for video_projects
-- ============================================================
CREATE TRIGGER update_video_projects_updated_at
  BEFORE UPDATE ON video_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Create Storage Bucket for video uploads (via SQL — Pro plan)
-- Note: Storage bucket creation via SQL may not work.
-- If it fails, create manually via Supabase Dashboard:
--   Bucket name: video-uploads, Private, Max 50MB
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('video-uploads', 'video-uploads', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for video-uploads bucket
CREATE POLICY "video_uploads_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'video-uploads');

CREATE POLICY "video_uploads_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'video-uploads');

CREATE POLICY "video_uploads_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'video-uploads');
