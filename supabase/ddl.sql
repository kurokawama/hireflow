-- HireFlow v2.0 DDL — AI Recruitment Engine
-- Run this against your Supabase project

-- ====================
-- ENUMS
-- ====================
DO $$ BEGIN
  CREATE TYPE role_type AS ENUM ('admin', 'hq_staff', 'store_manager', 'trainer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'review', 'approved', 'posted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ====================
-- TABLES
-- ====================

-- Organizations (single row for internal use)
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization members (internal users)
CREATE TABLE IF NOT EXISTS organization_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  auth_user_id  UUID NOT NULL REFERENCES auth.users(id),
  role          role_type NOT NULL DEFAULT 'store_manager',
  display_name  TEXT NOT NULL,
  email         TEXT NOT NULL,
  store_id      UUID,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, auth_user_id)
);

-- Stores
CREATE TABLE IF NOT EXISTS stores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  store_name    TEXT NOT NULL,
  brand         TEXT NOT NULL DEFAULT 'dr_stretch',
  location_text TEXT NOT NULL DEFAULT '',
  memo          TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for organization_members.store_id
ALTER TABLE organization_members
  ADD CONSTRAINT fk_member_store
  FOREIGN KEY (store_id) REFERENCES stores(id)
  ON DELETE SET NULL;

-- Profiles (brand voice configurations)
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  profile_name    TEXT NOT NULL,
  brand_name      TEXT NOT NULL,
  values          TEXT NOT NULL DEFAULT '',
  tone            TEXT NOT NULL DEFAULT '',
  must_include    TEXT[] NOT NULL DEFAULT '{}',
  ng_words        TEXT[] NOT NULL DEFAULT '{}',
  compliance_note TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff voices (testimonials with consent)
CREATE TABLE IF NOT EXISTS staff_voices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  store_id        UUID NOT NULL REFERENCES stores(id),
  speaker_name    TEXT NOT NULL,
  content_raw     TEXT NOT NULL,
  highlights      TEXT[] NOT NULL DEFAULT '{}',
  consent_status  TEXT NOT NULL DEFAULT 'pending',
  consented_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prompt templates (3 types x 4 platforms = 12)
CREATE TABLE IF NOT EXISTS prompt_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  template_type         TEXT NOT NULL,
  platform              TEXT NOT NULL,
  system_prompt         TEXT NOT NULL DEFAULT '',
  developer_prompt      TEXT NOT NULL DEFAULT '',
  user_prompt_template  TEXT NOT NULL DEFAULT '',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, template_type, platform)
);

-- Generation requests
CREATE TABLE IF NOT EXISTS generation_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  store_id        UUID NOT NULL REFERENCES stores(id),
  profile_id      UUID NOT NULL REFERENCES profiles(id),
  template_type   TEXT NOT NULL,
  platforms       TEXT[] NOT NULL DEFAULT '{}',
  requested_by    UUID NOT NULL REFERENCES auth.users(id),
  input_snapshot  JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'pending',
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated contents
CREATE TABLE IF NOT EXISTS generated_contents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organizations(id),
  generation_request_id   UUID NOT NULL REFERENCES generation_requests(id),
  store_id                UUID NOT NULL REFERENCES stores(id),
  platform                TEXT NOT NULL,
  channel                 TEXT NOT NULL DEFAULT 'organic',
  template_type           TEXT NOT NULL,
  body_text               TEXT NOT NULL DEFAULT '',
  parts_json              JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                  content_status NOT NULL DEFAULT 'draft',
  version                 INT NOT NULL DEFAULT 1,
  approved_by             UUID REFERENCES auth.users(id),
  approved_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content versions
CREATE TABLE IF NOT EXISTS content_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id  UUID NOT NULL REFERENCES generated_contents(id),
  version     INT NOT NULL,
  body_text   TEXT NOT NULL,
  parts_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  edited_by   UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content events
CREATE TABLE IF NOT EXISTS content_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  content_id    UUID NOT NULL REFERENCES generated_contents(id),
  actor_user_id UUID REFERENCES auth.users(id),
  event         TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Apply links (click tracking)
CREATE TABLE IF NOT EXISTS apply_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  content_id    UUID NOT NULL REFERENCES generated_contents(id),
  store_id      UUID NOT NULL REFERENCES stores(id),
  code          TEXT NOT NULL UNIQUE,
  target_url    TEXT NOT NULL,
  channel       TEXT NOT NULL DEFAULT 'organic',
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  click_count   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Candidates (quiz responses + CRM)
CREATE TABLE IF NOT EXISTS candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  store_id        UUID REFERENCES stores(id),
  source_channel  TEXT NOT NULL DEFAULT 'direct',
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  name            TEXT,
  email           TEXT,
  phone           TEXT,
  line_user_id    TEXT,
  quiz_answers    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_score        INT NOT NULL DEFAULT 0,
  score_factors   JSONB NOT NULL DEFAULT '{}'::jsonb,
  matched_store_id UUID REFERENCES stores(id),
  stage           TEXT NOT NULL DEFAULT 'quiz_completed',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Candidate events
CREATE TABLE IF NOT EXISTS candidate_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  candidate_id  UUID NOT NULL REFERENCES candidates(id),
  actor_user_id UUID REFERENCES auth.users(id),
  event         TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trainer posts tracking
CREATE TABLE IF NOT EXISTS trainer_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id),
  store_id    UUID NOT NULL REFERENCES stores(id),
  trainer_id  UUID NOT NULL REFERENCES auth.users(id),
  content_id  UUID NOT NULL REFERENCES generated_contents(id),
  platform    TEXT NOT NULL,
  posted_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id),
  actor_id    UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================
-- INDEXES
-- ====================
CREATE INDEX IF NOT EXISTS idx_members_org ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_members_auth ON organization_members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_stores_org ON stores(org_id);
CREATE INDEX IF NOT EXISTS idx_contents_store ON generated_contents(store_id);
CREATE INDEX IF NOT EXISTS idx_contents_status ON generated_contents(status);
CREATE INDEX IF NOT EXISTS idx_apply_links_code ON apply_links(code);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(stage);
CREATE INDEX IF NOT EXISTS idx_candidates_score ON candidates(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_events_candidate ON candidate_events(candidate_id);

-- ====================
-- RLS POLICIES
-- ====================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE apply_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: check org membership
CREATE OR REPLACE FUNCTION is_org_member(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = check_org_id
      AND auth_user_id = auth.uid()
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: check role
CREATE OR REPLACE FUNCTION has_org_role(check_org_id UUID, check_roles role_type[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = check_org_id
      AND auth_user_id = auth.uid()
      AND is_active = true
      AND role = ANY(check_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Single org: all authenticated members can read
CREATE POLICY "members_read_org" ON organizations
  FOR SELECT USING (is_org_member(id));

CREATE POLICY "members_read_members" ON organization_members
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_stores" ON stores
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_profiles" ON profiles
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_voices" ON staff_voices
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_templates" ON prompt_templates
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_requests" ON generation_requests
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_contents" ON generated_contents
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_versions" ON content_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM generated_contents gc
      WHERE gc.id = content_versions.content_id
        AND is_org_member(gc.org_id)
    )
  );

CREATE POLICY "members_read_events" ON content_events
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_apply_links" ON apply_links
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_candidates" ON candidates
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_candidate_events" ON candidate_events
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_trainer_posts" ON trainer_posts
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_audit" ON audit_logs
  FOR SELECT USING (is_org_member(org_id));

-- ====================
-- UPDATED_AT TRIGGERS
-- ====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_organizations_updated
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_members_updated
  BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_stores_updated
  BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_voices_updated
  BEFORE UPDATE ON staff_voices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_templates_updated
  BEFORE UPDATE ON prompt_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_contents_updated
  BEFORE UPDATE ON generated_contents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_candidates_updated
  BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
