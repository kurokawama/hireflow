-- のびてる スカウティングツール v2.5 Migration
-- Dynamic quiz campaigns, scoring profiles, and candidate lists

-- ====================
-- NEW TABLES
-- ====================

-- Quiz campaigns (different quiz configurations per brand/purpose)
CREATE TABLE IF NOT EXISTS quiz_campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  brand       TEXT NOT NULL DEFAULT 'dr_stretch',
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz questions (dynamic questions per campaign)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES quiz_campaigns(id) ON DELETE CASCADE,
  question_key  TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single_select',
  sort_order    INT NOT NULL DEFAULT 0,
  is_required   BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, question_key)
);

-- Quiz options (choices for each question)
CREATE TABLE IF NOT EXISTS quiz_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_value  TEXT NOT NULL,
  option_label  TEXT NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, option_value)
);

-- Scoring profiles (configurable scoring weights per campaign)
CREATE TABLE IF NOT EXISTS scoring_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES quiz_campaigns(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'default',
  weights_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, name)
);

-- Candidate lists (organized by brand/purpose)
CREATE TABLE IF NOT EXISTS candidate_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id),
  name        TEXT NOT NULL,
  brand       TEXT,
  purpose     TEXT,
  description TEXT,
  created_by  UUID REFERENCES auth.users(id),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Candidate list members (many-to-many)
CREATE TABLE IF NOT EXISTS candidate_list_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id        UUID NOT NULL REFERENCES candidate_lists(id) ON DELETE CASCADE,
  candidate_id   UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  added_by       UUID REFERENCES auth.users(id),
  notes          TEXT,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_id, candidate_id)
);

-- ====================
-- ALTER EXISTING TABLES
-- ====================

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES quiz_campaigns(id);

-- ====================
-- INDEXES
-- ====================

CREATE INDEX IF NOT EXISTS idx_quiz_campaigns_slug ON quiz_campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_quiz_campaigns_active ON quiz_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_campaign ON quiz_questions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON quiz_options(question_id);
CREATE INDEX IF NOT EXISTS idx_scoring_profiles_campaign ON scoring_profiles(campaign_id);
CREATE INDEX IF NOT EXISTS idx_candidate_lists_org ON candidate_lists(org_id);
CREATE INDEX IF NOT EXISTS idx_clm_list ON candidate_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_clm_candidate ON candidate_list_members(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidates_campaign ON candidates(campaign_id);

-- ====================
-- RLS
-- ====================

ALTER TABLE quiz_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_list_members ENABLE ROW LEVEL SECURITY;

-- Authenticated members can read all quiz data
CREATE POLICY "members_read_quiz_campaigns" ON quiz_campaigns
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_quiz_questions" ON quiz_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM quiz_campaigns qc WHERE qc.id = quiz_questions.campaign_id AND is_org_member(qc.org_id))
  );

CREATE POLICY "members_read_quiz_options" ON quiz_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_questions qq
      JOIN quiz_campaigns qc ON qc.id = qq.campaign_id
      WHERE qq.id = quiz_options.question_id AND is_org_member(qc.org_id)
    )
  );

CREATE POLICY "members_read_scoring_profiles" ON scoring_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM quiz_campaigns qc WHERE qc.id = scoring_profiles.campaign_id AND is_org_member(qc.org_id))
  );

CREATE POLICY "members_read_candidate_lists" ON candidate_lists
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "members_read_clm" ON candidate_list_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM candidate_lists cl WHERE cl.id = candidate_list_members.list_id AND is_org_member(cl.org_id))
  );

-- Public access to active quiz campaigns (anon users taking the quiz)
CREATE POLICY "public_read_active_campaigns" ON quiz_campaigns
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_read_campaign_questions" ON quiz_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM quiz_campaigns qc WHERE qc.id = quiz_questions.campaign_id AND qc.is_active = true)
  );

CREATE POLICY "public_read_question_options" ON quiz_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_questions qq
      JOIN quiz_campaigns qc ON qc.id = qq.campaign_id
      WHERE qq.id = quiz_options.question_id AND qc.is_active = true
    )
  );

-- ====================
-- UPDATED_AT TRIGGERS
-- ====================

CREATE OR REPLACE TRIGGER trg_quiz_campaigns_updated
  BEFORE UPDATE ON quiz_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_quiz_questions_updated
  BEFORE UPDATE ON quiz_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_scoring_profiles_updated
  BEFORE UPDATE ON scoring_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_candidate_lists_updated
  BEFORE UPDATE ON candidate_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ====================
-- SEED DATA: Default campaign with existing hardcoded questions
-- ====================

DO $$
DECLARE
  v_org_id UUID;
  v_campaign_id UUID;
  v_q1_id UUID;
  v_q2_id UUID;
  v_q3_id UUID;
  v_q4_id UUID;
  v_q5_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  -- Default campaign
  INSERT INTO quiz_campaigns (id, org_id, name, slug, brand, is_active, is_default, description)
  VALUES (gen_random_uuid(), v_org_id, 'Dr.Stretch / Wecle 標準採用クイズ', 'default', 'dr_stretch', true, true, '標準の採用適性診断クイズ')
  RETURNING id INTO v_campaign_id;

  -- Q1: Sports experience
  INSERT INTO quiz_questions (id, campaign_id, question_key, question_text, question_type, sort_order, is_required)
  VALUES (gen_random_uuid(), v_campaign_id, 'sports_exp', 'スポーツ・フィットネスの経験は？', 'single_select', 1, true)
  RETURNING id INTO v_q1_id;

  INSERT INTO quiz_options (question_id, option_value, option_label, sort_order) VALUES
    (v_q1_id, 'current', '現在もやっている', 1),
    (v_q1_id, 'past', '以前やっていた', 2),
    (v_q1_id, 'injury_break', '怪我で中断した', 3),
    (v_q1_id, 'spectator', '観戦が好き', 4),
    (v_q1_id, 'none', '特になし', 5);

  -- Q2: Interests
  INSERT INTO quiz_questions (id, campaign_id, question_key, question_text, question_type, sort_order, is_required)
  VALUES (gen_random_uuid(), v_campaign_id, 'interests', '興味のある分野は？', 'multi_select', 2, true)
  RETURNING id INTO v_q2_id;

  INSERT INTO quiz_options (question_id, option_value, option_label, sort_order) VALUES
    (v_q2_id, 'body_care', 'ボディケア', 1),
    (v_q2_id, 'training', 'トレーニング指導', 2),
    (v_q2_id, 'customer_service', '接客', 3),
    (v_q2_id, 'health_work', '健康に関わる仕事', 4);

  -- Q3: Area
  INSERT INTO quiz_questions (id, campaign_id, question_key, question_text, question_type, sort_order, is_required)
  VALUES (gen_random_uuid(), v_campaign_id, 'area', '希望エリアは？', 'text_input', 3, true)
  RETURNING id INTO v_q3_id;

  -- Q4: Age range
  INSERT INTO quiz_questions (id, campaign_id, question_key, question_text, question_type, sort_order, is_required)
  VALUES (gen_random_uuid(), v_campaign_id, 'age_range', '年齢は？', 'single_select', 4, true)
  RETURNING id INTO v_q4_id;

  INSERT INTO quiz_options (question_id, option_value, option_label, sort_order) VALUES
    (v_q4_id, '18-22', '18〜22歳', 1),
    (v_q4_id, '23-27', '23〜27歳', 2),
    (v_q4_id, '28-32', '28〜32歳', 3),
    (v_q4_id, '33+', '33歳以上', 4);

  -- Q5: Start timing
  INSERT INTO quiz_questions (id, campaign_id, question_key, question_text, question_type, sort_order, is_required)
  VALUES (gen_random_uuid(), v_campaign_id, 'start_timing', 'いつから始められますか？', 'single_select', 5, true)
  RETURNING id INTO v_q5_id;

  INSERT INTO quiz_options (question_id, option_value, option_label, sort_order) VALUES
    (v_q5_id, 'immediately', 'すぐに', 1),
    (v_q5_id, '1-3months', '1〜3ヶ月以内', 2),
    (v_q5_id, 'exploring', 'まだ考え中', 3);

  -- Default scoring profile
  INSERT INTO scoring_profiles (campaign_id, name, weights_json, is_active)
  VALUES (
    v_campaign_id,
    'default',
    '{
      "sports_exp": {"max_score": 25, "values": {"current": 25, "past": 20, "injury_break": 22, "spectator": 10, "none": 5}},
      "age_range": {"max_score": 25, "values": {"18-22": 25, "23-27": 22, "28-32": 15, "33+": 10}},
      "area": {"max_score": 15, "default": 15},
      "start_timing": {"max_score": 20, "values": {"immediately": 20, "1-3months": 15, "exploring": 8}},
      "interests": {"max_score": 15, "high_value": ["body_care", "training", "health_work"], "per_match": 5, "base": 5}
    }'::jsonb,
    true
  );
END $$;
