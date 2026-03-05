-- Phase C: Full Auto Pipeline — Ad Campaigns + Employee Advocacy
-- Tables: ad_audiences, ad_campaigns, attribute_analyses,
--         staff_sns_accounts, posting_kits, staff_shares

-- ============================================================
-- Ad Audiences (targeting configurations)
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  audience_type TEXT NOT NULL DEFAULT 'core', -- 'core' | 'custom' | 'lookalike'
  target_list_id UUID REFERENCES target_lists(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'meta', -- 'meta' | 'google' | 'x'
  targeting_attributes JSONB NOT NULL DEFAULT '{}',
  external_audience_id TEXT,
  estimated_reach INT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'building' | 'ready' | 'error'
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ad_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_audiences_select" ON ad_audiences
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "ad_audiences_insert" ON ad_audiences
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "ad_audiences_update" ON ad_audiences
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "ad_audiences_delete" ON ad_audiences
  FOR DELETE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE ad_audiences IS 'Ad targeting audiences built from target list analysis';

-- ============================================================
-- Ad Campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'meta', -- 'meta' | 'google' | 'x'
  audience_id UUID NOT NULL REFERENCES ad_audiences(id),
  content_id UUID NOT NULL REFERENCES generated_contents(id),
  daily_budget_jpy INT NOT NULL DEFAULT 0,
  total_budget_jpy INT,
  start_date DATE,
  end_date DATE,
  external_campaign_id TEXT,
  external_ad_set_id TEXT,
  external_ad_id TEXT,
  performance JSONB, -- {impressions, clicks, ctr, cpc_jpy, cpm_jpy, spend_jpy, conversions}
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused' | 'completed' | 'failed'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_campaigns_select" ON ad_campaigns
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "ad_campaigns_insert" ON ad_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "ad_campaigns_update" ON ad_campaigns
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "ad_campaigns_delete" ON ad_campaigns
  FOR DELETE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE ad_campaigns IS 'Ad campaigns across Meta/Google/X platforms';

-- ============================================================
-- Attribute Analyses (AI-generated targeting insights)
-- ============================================================
CREATE TABLE IF NOT EXISTS attribute_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  target_list_id UUID NOT NULL REFERENCES target_lists(id),
  summary_text TEXT NOT NULL, -- AI-generated: "20-30歳、東京圏、フィットネス関心層"
  targeting_attributes JSONB NOT NULL DEFAULT '{}',
  recommended_platforms TEXT[] NOT NULL DEFAULT '{}',
  recommended_daily_budget_jpy INT NOT NULL DEFAULT 5000,
  strategy_notes TEXT, -- AI recommendations
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE attribute_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attribute_analyses_select" ON attribute_analyses
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "attribute_analyses_insert" ON attribute_analyses
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE attribute_analyses IS 'AI-generated targeting attribute analyses from target lists';

-- ============================================================
-- Staff SNS Accounts (Employee Advocacy)
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_sns_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  platform TEXT NOT NULL, -- 'instagram' | 'x' | 'tiktok' | 'facebook'
  username TEXT NOT NULL,
  follower_count INT,
  is_champion BOOLEAN NOT NULL DEFAULT false,
  store_id UUID REFERENCES stores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id, platform)
);

ALTER TABLE staff_sns_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_sns_select" ON staff_sns_accounts
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "staff_sns_insert" ON staff_sns_accounts
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "staff_sns_update" ON staff_sns_accounts
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "staff_sns_delete" ON staff_sns_accounts
  FOR DELETE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE staff_sns_accounts IS 'Staff personal SNS accounts for Employee Advocacy';

-- ============================================================
-- Posting Kits (きっかけキット)
-- ============================================================
CREATE TABLE IF NOT EXISTS posting_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  hints JSONB NOT NULL DEFAULT '[]', -- [{hint_text, example_description}]
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  template_text TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  target_list_id UUID REFERENCES target_lists(id) ON DELETE SET NULL,
  brand TEXT, -- 'dr_stretch' | 'wecle'
  scheduled_at TIMESTAMPTZ,
  distributed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'scheduled' | 'distributed' | 'archived'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE posting_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posting_kits_select" ON posting_kits
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "posting_kits_insert" ON posting_kits
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "posting_kits_update" ON posting_kits
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "posting_kits_delete" ON posting_kits
  FOR DELETE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE posting_kits IS 'Weekly content kits distributed to staff for Employee Advocacy';

-- ============================================================
-- Staff Shares (share tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  kit_id UUID NOT NULL REFERENCES posting_kits(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  platform TEXT NOT NULL, -- 'instagram' | 'x' | 'tiktok' | 'facebook'
  post_url TEXT,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staff_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_shares_select" ON staff_shares
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "staff_shares_insert" ON staff_shares
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

COMMENT ON TABLE staff_shares IS 'Tracking staff social media shares for advocacy leaderboard';

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ad_audiences_org ON ad_audiences(org_id);
CREATE INDEX IF NOT EXISTS idx_ad_audiences_list ON ad_audiences(target_list_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_org ON ad_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_audience ON ad_campaigns(audience_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_attribute_analyses_list ON attribute_analyses(target_list_id);
CREATE INDEX IF NOT EXISTS idx_staff_sns_org ON staff_sns_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_sns_user ON staff_sns_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_posting_kits_org ON posting_kits(org_id);
CREATE INDEX IF NOT EXISTS idx_posting_kits_status ON posting_kits(status);
CREATE INDEX IF NOT EXISTS idx_staff_shares_kit ON staff_shares(kit_id);
CREATE INDEX IF NOT EXISTS idx_staff_shares_user ON staff_shares(user_id);

-- ============================================================
-- RPC Functions for Leaderboard
-- ============================================================

-- Staff share leaderboard
CREATE OR REPLACE FUNCTION get_share_leaderboard_staff(
  p_org_id UUID,
  p_period TEXT DEFAULT 'month'
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  store_name TEXT,
  share_count BIGINT,
  is_champion BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.user_id,
    om.display_name,
    COALESCE(s.store_name, '未所属') AS store_name,
    COUNT(ss.id) AS share_count,
    COALESCE(ssa.is_champion, false) AS is_champion
  FROM staff_shares ss
  JOIN organization_members om ON om.auth_user_id = ss.user_id AND om.org_id = ss.org_id
  LEFT JOIN stores s ON s.id = om.store_id
  LEFT JOIN staff_sns_accounts ssa ON ssa.user_id = ss.user_id AND ssa.org_id = ss.org_id AND ssa.is_champion = true
  WHERE ss.org_id = p_org_id
    AND (
      (p_period = 'week' AND ss.shared_at >= now() - interval '7 days')
      OR (p_period = 'month' AND ss.shared_at >= now() - interval '30 days')
      OR (p_period = 'all')
    )
  GROUP BY ss.user_id, om.display_name, s.store_name, ssa.is_champion
  ORDER BY share_count DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Store share leaderboard
CREATE OR REPLACE FUNCTION get_share_leaderboard_store(
  p_org_id UUID,
  p_period TEXT DEFAULT 'month'
)
RETURNS TABLE (
  store_id UUID,
  store_name TEXT,
  brand TEXT,
  total_shares BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS store_id,
    s.store_name,
    s.brand,
    COUNT(ss.id) AS total_shares
  FROM staff_shares ss
  JOIN organization_members om ON om.auth_user_id = ss.user_id AND om.org_id = ss.org_id
  JOIN stores s ON s.id = om.store_id
  WHERE ss.org_id = p_org_id
    AND (
      (p_period = 'week' AND ss.shared_at >= now() - interval '7 days')
      OR (p_period = 'month' AND ss.shared_at >= now() - interval '30 days')
      OR (p_period = 'all')
    )
  GROUP BY s.id, s.store_name, s.brand
  ORDER BY total_shares DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Updated_at triggers for new tables
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['ad_audiences', 'ad_campaigns', 'staff_sns_accounts', 'posting_kits'])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
