-- Phase C-2: SNS Auto-Posting Pipeline
-- Tables: sns_connections, posting_queue, posting_logs
-- Adds media_urls column to generated_contents

-- ============================================================
-- SNS Connections (OAuth token storage per org)
-- ============================================================
CREATE TABLE IF NOT EXISTS sns_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  platform TEXT NOT NULL, -- 'facebook' | 'instagram' | 'x' | 'line' | 'tiktok' | 'youtube'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  external_account_id TEXT, -- platform-specific account/page ID
  external_account_name TEXT,
  account_metadata JSONB NOT NULL DEFAULT '{}', -- page_id, screen_name, etc.
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'expired' | 'revoked'
  connected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, platform, external_account_id)
);

ALTER TABLE sns_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sns_connections_select" ON sns_connections
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "sns_connections_insert" ON sns_connections
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "sns_connections_update" ON sns_connections
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "sns_connections_delete" ON sns_connections
  FOR DELETE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE sns_connections IS 'OAuth connections to SNS platforms for auto-posting';

-- ============================================================
-- Posting Queue (scheduled and immediate posts)
-- ============================================================
CREATE TABLE IF NOT EXISTS posting_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  content_id UUID NOT NULL REFERENCES generated_contents(id),
  connection_id UUID NOT NULL REFERENCES sns_connections(id),
  platform TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ, -- NULL = immediate
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'posted' | 'failed' | 'cancelled'
  external_post_id TEXT, -- platform-specific post ID after posting
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  approved_by UUID NOT NULL REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE posting_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posting_queue_select" ON posting_queue
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "posting_queue_insert" ON posting_queue
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "posting_queue_update" ON posting_queue
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "posting_queue_delete" ON posting_queue
  FOR DELETE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE posting_queue IS 'Queue for scheduled and immediate SNS posts';

-- ============================================================
-- Posting Logs (audit trail for all posting attempts)
-- ============================================================
CREATE TABLE IF NOT EXISTS posting_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  queue_id UUID REFERENCES posting_queue(id) ON DELETE SET NULL,
  content_id UUID NOT NULL REFERENCES generated_contents(id),
  platform TEXT NOT NULL,
  action TEXT NOT NULL, -- 'attempted' | 'succeeded' | 'failed' | 'retried'
  external_post_id TEXT,
  response_data JSONB NOT NULL DEFAULT '{}',
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE posting_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posting_logs_select" ON posting_logs
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "posting_logs_insert" ON posting_logs
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE posting_logs IS 'Audit log for all SNS posting attempts and results';

-- ============================================================
-- Add media_urls to generated_contents (if not exists)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_contents' AND column_name = 'media_urls'
  ) THEN
    ALTER TABLE generated_contents ADD COLUMN media_urls TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END;
$$;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sns_connections_org ON sns_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_sns_connections_platform ON sns_connections(org_id, platform);
CREATE INDEX IF NOT EXISTS idx_sns_connections_status ON sns_connections(status);

CREATE INDEX IF NOT EXISTS idx_posting_queue_org ON posting_queue(org_id);
CREATE INDEX IF NOT EXISTS idx_posting_queue_status ON posting_queue(status);
CREATE INDEX IF NOT EXISTS idx_posting_queue_scheduled ON posting_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_posting_queue_content ON posting_queue(content_id);

CREATE INDEX IF NOT EXISTS idx_posting_logs_org ON posting_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_posting_logs_queue ON posting_logs(queue_id);
CREATE INDEX IF NOT EXISTS idx_posting_logs_content ON posting_logs(content_id);

-- ============================================================
-- Updated_at triggers
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['sns_connections', 'posting_queue'])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
