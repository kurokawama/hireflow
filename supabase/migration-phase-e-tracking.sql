-- Phase E: Entry Tracking + LINE@ Integration
-- Tables: entry_tracking, line_settings
-- RPC: get_funnel_metrics
-- Column additions: candidates.line_follow_at, candidates.interview_booked_at

-- ============================================================
-- Entry Tracking (funnel event log)
-- ============================================================
CREATE TABLE IF NOT EXISTS entry_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  posting_queue_id UUID REFERENCES posting_queue(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  entry_source TEXT NOT NULL, -- 'organic_post' | 'paid_ad' | 'advocacy_share' | 'direct'
  referral_platform TEXT, -- 'instagram' | 'x' | 'facebook' | 'line' | 'tiktok'
  funnel_step TEXT NOT NULL, -- 'impression' | 'click' | 'quiz_start' | 'quiz_complete' | 'line_follow' | 'interview_book'
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE entry_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entry_tracking_select" ON entry_tracking
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "entry_tracking_insert" ON entry_tracking
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE entry_tracking IS 'Funnel event tracking: impression → click → quiz → LINE → interview';

-- ============================================================
-- LINE Settings (per-org LINE configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS line_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) UNIQUE,
  interview_booking_url TEXT, -- External booking system URL
  welcome_message TEXT NOT NULL DEFAULT 'ご登録ありがとうございます！面接のご予約はこちらから。',
  follow_up_messages JSONB NOT NULL DEFAULT '[]', -- [{delay_hours, message_text}]
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE line_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "line_settings_select" ON line_settings
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "line_settings_insert" ON line_settings
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "line_settings_update" ON line_settings
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE line_settings IS 'Organization LINE Messaging API settings';

-- ============================================================
-- Add columns to candidates table
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'line_follow_at'
  ) THEN
    ALTER TABLE candidates ADD COLUMN line_follow_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'interview_booked_at'
  ) THEN
    ALTER TABLE candidates ADD COLUMN interview_booked_at TIMESTAMPTZ;
  END IF;
END;
$$;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_entry_tracking_org ON entry_tracking(org_id);
CREATE INDEX IF NOT EXISTS idx_entry_tracking_funnel ON entry_tracking(funnel_step);
CREATE INDEX IF NOT EXISTS idx_entry_tracking_source ON entry_tracking(entry_source);
CREATE INDEX IF NOT EXISTS idx_entry_tracking_created ON entry_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_entry_tracking_candidate ON entry_tracking(candidate_id);
CREATE INDEX IF NOT EXISTS idx_line_settings_org ON line_settings(org_id);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE TRIGGER update_line_settings_updated_at
  BEFORE UPDATE ON line_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RPC: Funnel Metrics
-- ============================================================
CREATE OR REPLACE FUNCTION get_funnel_metrics(
  p_org_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE (
  funnel_step TEXT,
  total_count BIGINT,
  by_source JSONB,
  by_platform JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    et.funnel_step,
    COUNT(*) AS total_count,
    jsonb_object_agg(
      COALESCE(et.entry_source, 'unknown'),
      source_counts.cnt
    ) AS by_source,
    jsonb_object_agg(
      COALESCE(et.referral_platform, 'unknown'),
      platform_counts.cnt
    ) AS by_platform
  FROM entry_tracking et
  LEFT JOIN LATERAL (
    SELECT et.entry_source AS src, COUNT(*) AS cnt
    FROM entry_tracking et2
    WHERE et2.org_id = p_org_id
      AND et2.funnel_step = et.funnel_step
      AND et2.entry_source = et.entry_source
      AND et2.created_at >= now() - (p_days || ' days')::INTERVAL
    GROUP BY et2.entry_source
  ) source_counts ON true
  LEFT JOIN LATERAL (
    SELECT et.referral_platform AS plat, COUNT(*) AS cnt
    FROM entry_tracking et3
    WHERE et3.org_id = p_org_id
      AND et3.funnel_step = et.funnel_step
      AND et3.referral_platform = et.referral_platform
      AND et3.created_at >= now() - (p_days || ' days')::INTERVAL
    GROUP BY et3.referral_platform
  ) platform_counts ON true
  WHERE et.org_id = p_org_id
    AND et.created_at >= now() - (p_days || ' days')::INTERVAL
  GROUP BY et.funnel_step
  ORDER BY
    CASE et.funnel_step
      WHEN 'impression' THEN 1
      WHEN 'click' THEN 2
      WHEN 'quiz_start' THEN 3
      WHEN 'quiz_complete' THEN 4
      WHEN 'line_follow' THEN 5
      WHEN 'interview_book' THEN 6
      ELSE 99
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
