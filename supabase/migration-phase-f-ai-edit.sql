-- Phase F: AI Video Auto-Editing
-- Table: ai_edit_jobs

CREATE TABLE IF NOT EXISTS ai_edit_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  video_project_id UUID NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'runway', -- 'runway' | 'future_provider'
  input_config JSONB NOT NULL DEFAULT '{}', -- {style, prompt, duration, etc.}
  output_media_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
  cost_usd DECIMAL(10, 4),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  error_message TEXT,
  processing_time_seconds INT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_edit_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_edit_jobs_select" ON ai_edit_jobs
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "ai_edit_jobs_insert" ON ai_edit_jobs
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "ai_edit_jobs_update" ON ai_edit_jobs
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE ai_edit_jobs IS 'AI video editing jobs via Runway ML or other providers';

CREATE INDEX IF NOT EXISTS idx_ai_edit_jobs_org ON ai_edit_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_edit_jobs_project ON ai_edit_jobs(video_project_id);
CREATE INDEX IF NOT EXISTS idx_ai_edit_jobs_status ON ai_edit_jobs(status);

CREATE TRIGGER update_ai_edit_jobs_updated_at
  BEFORE UPDATE ON ai_edit_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
