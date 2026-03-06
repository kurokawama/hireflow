-- Phase G: Experience Tickets + Automated Recruitment Funnel
-- Tables: experience_tickets, ticket_settings
-- Column additions: candidates に ticket_issued_at, ticket_redeemed_at

-- ============================================================
-- Ticket Settings (per-campaign or per-org configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  campaign_id     UUID REFERENCES quiz_campaigns(id) ON DELETE SET NULL,
  score_threshold INT NOT NULL DEFAULT 70,
  ticket_type     TEXT NOT NULL DEFAULT 'dr_stretch_60min',
  expiry_days     INT NOT NULL DEFAULT 30,
  auto_issue      BOOLEAN NOT NULL DEFAULT true,
  line_message    TEXT NOT NULL DEFAULT 'おめでとうございます！条件を満たした方に特別体験チケットをお送りします。',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, campaign_id)
);

-- ============================================================
-- Experience Tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS experience_tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  candidate_id      UUID NOT NULL REFERENCES candidates(id),
  ticket_type       TEXT NOT NULL DEFAULT 'dr_stretch_60min',
  ticket_code       TEXT NOT NULL UNIQUE,
  qr_code_url       TEXT,
  status            TEXT NOT NULL DEFAULT 'issued',
  issued_via        TEXT NOT NULL DEFAULT 'line',
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at       TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL,
  redeemed_store_id UUID REFERENCES stores(id),
  visitor_info      JSONB NOT NULL DEFAULT '{}',
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE ticket_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_settings_select" ON ticket_settings
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "ticket_settings_insert" ON ticket_settings
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "ticket_settings_update" ON ticket_settings
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "experience_tickets_select" ON experience_tickets
  FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "experience_tickets_insert" ON experience_tickets
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "experience_tickets_update" ON experience_tickets
  FOR UPDATE TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid()
  ));

-- ============================================================
-- Candidate columns
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'ticket_issued_at'
  ) THEN
    ALTER TABLE candidates ADD COLUMN ticket_issued_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'ticket_redeemed_at'
  ) THEN
    ALTER TABLE candidates ADD COLUMN ticket_redeemed_at TIMESTAMPTZ;
  END IF;
END;
$$;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_experience_tickets_org ON experience_tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_experience_tickets_candidate ON experience_tickets(candidate_id);
CREATE INDEX IF NOT EXISTS idx_experience_tickets_code ON experience_tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_experience_tickets_status ON experience_tickets(status);
CREATE INDEX IF NOT EXISTS idx_experience_tickets_expires ON experience_tickets(expires_at);
CREATE INDEX IF NOT EXISTS idx_ticket_settings_org ON ticket_settings(org_id);

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE TRIGGER update_ticket_settings_updated_at
  BEFORE UPDATE ON ticket_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experience_tickets_updated_at
  BEFORE UPDATE ON experience_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Storage bucket for QR codes
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('tickets', 'tickets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to ticket QR codes
CREATE POLICY "tickets_public_read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'tickets');

-- Allow authenticated users to upload QR codes
CREATE POLICY "tickets_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tickets');

-- Allow service role full access (for admin client)
CREATE POLICY "tickets_service_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'tickets');
