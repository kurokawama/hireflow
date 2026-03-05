-- Phase B: Target List Management + AI Content Strategy
-- 5 new tables + RLS policies + indexes

-- ============================================================
-- 1. target_lists — Brand/keyword-based groups
-- ============================================================
CREATE TABLE IF NOT EXISTS target_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT, -- 'dr_stretch' | 'wecle' | null
  keywords TEXT[] DEFAULT '{}',
  platform_filter TEXT[] DEFAULT '{}',
  profile_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE target_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "target_lists_select" ON target_lists FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "target_lists_insert" ON target_lists FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "target_lists_update" ON target_lists FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "target_lists_delete" ON target_lists FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM organization_members
    WHERE auth_user_id = auth.uid() AND is_active = true AND role IN ('admin', 'hq_staff')
  ));

CREATE INDEX idx_target_lists_org ON target_lists(org_id);

-- ============================================================
-- 2. target_profiles — Individual SNS account CRM
-- ============================================================
CREATE TABLE IF NOT EXISTS target_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES target_lists(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'instagram' | 'tiktok' | 'youtube' | 'x' | 'facebook' | 'line'
  profile_url TEXT,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  follower_count INT,
  interest_tags TEXT[] DEFAULT '{}',
  persona_category TEXT DEFAULT 'potential_applicant',
  ai_score INT DEFAULT 0,
  score_factors JSONB DEFAULT '{}',
  source TEXT DEFAULT 'manual', -- 'manual' | 'youtube_search' | 'x_search' | 'instagram_hashtag'
  notes TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'contacted' | 'applied' | 'archived'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE target_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "target_profiles_select" ON target_profiles FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "target_profiles_insert" ON target_profiles FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "target_profiles_update" ON target_profiles FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "target_profiles_delete" ON target_profiles FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE INDEX idx_target_profiles_list ON target_profiles(list_id);
CREATE INDEX idx_target_profiles_org ON target_profiles(org_id);
CREATE INDEX idx_target_profiles_platform ON target_profiles(platform);

-- ============================================================
-- 3. content_calendar — Weekly content calendar
-- ============================================================
CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  target_list_id UUID REFERENCES target_lists(id) ON DELETE SET NULL,
  strategy_text TEXT,
  calendar_json JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft', -- 'draft' | 'approved' | 'in_progress' | 'completed'
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_calendar_select" ON content_calendar FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "content_calendar_insert" ON content_calendar FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "content_calendar_update" ON content_calendar FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE INDEX idx_content_calendar_org ON content_calendar(org_id);
CREATE INDEX idx_content_calendar_week ON content_calendar(week_start);

-- ============================================================
-- 4. content_tasks — Tasks generated from calendar
-- ============================================================
CREATE TABLE IF NOT EXISTS content_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  calendar_id UUID NOT NULL REFERENCES content_calendar(id) ON DELETE CASCADE,
  content_id UUID REFERENCES generated_contents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'image' | 'video_script'
  due_date DATE,
  assignee_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed' | 'skipped'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_tasks_select" ON content_tasks FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "content_tasks_insert" ON content_tasks FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "content_tasks_update" ON content_tasks FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE INDEX idx_content_tasks_calendar ON content_tasks(calendar_id);
CREATE INDEX idx_content_tasks_org ON content_tasks(org_id);
CREATE INDEX idx_content_tasks_status ON content_tasks(status);

-- ============================================================
-- 5. youtube_search_cache — API call reduction
-- ============================================================
CREATE TABLE IF NOT EXISTS youtube_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_json JSONB DEFAULT '[]',
  result_count INT DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE youtube_search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "youtube_search_cache_select" ON youtube_search_cache FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "youtube_search_cache_insert" ON youtube_search_cache FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM organization_members WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE INDEX idx_youtube_cache_query ON youtube_search_cache(query, org_id);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['target_lists', 'target_profiles', 'content_calendar', 'content_tasks'])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- Trigger: auto-update target_lists.profile_count
-- ============================================================
CREATE OR REPLACE FUNCTION update_profile_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE target_lists SET profile_count = profile_count + 1 WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE target_lists SET profile_count = profile_count - 1 WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_target_list_profile_count
AFTER INSERT OR DELETE ON target_profiles
FOR EACH ROW EXECUTE FUNCTION update_profile_count();
