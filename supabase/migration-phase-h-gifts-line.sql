-- Phase H: Gift Distribution + LINE Delivery
-- Tables: gift_codes, gift_distributions, gift_settings, line_delivery_logs

-- ============================================================
-- Gift Settings (per-campaign auto-distribution config)
-- ============================================================
CREATE TABLE IF NOT EXISTS gift_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  campaign_id     UUID REFERENCES quiz_campaigns(id) ON DELETE SET NULL,
  gift_type       TEXT NOT NULL DEFAULT 'amazon',
  auto_distribute BOOLEAN NOT NULL DEFAULT true,
  score_threshold INT,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, campaign_id)
);

-- ============================================================
-- Gift Codes (inventory of gift codes)
-- ============================================================
CREATE TABLE IF NOT EXISTS gift_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  campaign_id     UUID REFERENCES quiz_campaigns(id) ON DELETE SET NULL,
  gift_type       TEXT NOT NULL DEFAULT 'amazon',
  code            TEXT NOT NULL UNIQUE,
  amount_yen      INT,
  status          TEXT NOT NULL DEFAULT 'available',
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Gift Distributions (distribution history)
-- ============================================================
CREATE TABLE IF NOT EXISTS gift_distributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  gift_code_id    UUID NOT NULL REFERENCES gift_codes(id),
  candidate_id    UUID NOT NULL REFERENCES candidates(id),
  campaign_id     UUID REFERENCES quiz_campaigns(id),
  distributed_via TEXT NOT NULL DEFAULT 'line',
  line_sent       BOOLEAN NOT NULL DEFAULT false,
  distributed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, campaign_id)
);

-- ============================================================
-- LINE Delivery Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS line_delivery_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  campaign_id     UUID REFERENCES quiz_campaigns(id),
  delivery_type   TEXT NOT NULL DEFAULT 'multicast',
  recipient_count INT NOT NULL DEFAULT 0,
  message_text    TEXT NOT NULL,
  quiz_url        TEXT,
  status          TEXT NOT NULL DEFAULT 'sent',
  error_message   TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE gift_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_delivery_logs ENABLE ROW LEVEL SECURITY;

-- gift_settings
CREATE POLICY "gift_settings_select" ON gift_settings
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "gift_settings_insert" ON gift_settings
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "gift_settings_update" ON gift_settings
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

-- gift_codes
CREATE POLICY "gift_codes_select" ON gift_codes
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "gift_codes_insert" ON gift_codes
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "gift_codes_update" ON gift_codes
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

-- gift_distributions
CREATE POLICY "gift_distributions_select" ON gift_distributions
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "gift_distributions_insert" ON gift_distributions
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

-- line_delivery_logs
CREATE POLICY "line_delivery_logs_select" ON line_delivery_logs
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "line_delivery_logs_insert" ON line_delivery_logs
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_gift_settings_org ON gift_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_gift_codes_org ON gift_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_gift_codes_campaign ON gift_codes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gift_codes_status ON gift_codes(status);
CREATE INDEX IF NOT EXISTS idx_gift_distributions_org ON gift_distributions(org_id);
CREATE INDEX IF NOT EXISTS idx_gift_distributions_candidate ON gift_distributions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_gift_distributions_campaign ON gift_distributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_line_delivery_logs_org ON line_delivery_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_line_delivery_logs_campaign ON line_delivery_logs(campaign_id);

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE TRIGGER update_gift_settings_updated_at
  BEFORE UPDATE ON gift_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
