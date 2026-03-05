-- のびてる スカウティングツール v3.0 Phase A Migration
-- AI-HR conversation board for content editing

-- ====================
-- NEW TABLES
-- ====================

-- Content conversations (1:1 with generated_contents)
CREATE TABLE IF NOT EXISTS content_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id),
  content_id  UUID NOT NULL REFERENCES generated_contents(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_id)
);

-- Conversation messages
CREATE TABLE IF NOT EXISTS conversation_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES content_conversations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL,
  content           TEXT NOT NULL,
  revised_body_text TEXT,
  revised_parts_json JSONB,
  actor_user_id     UUID REFERENCES auth.users(id),
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================
-- INDEXES
-- ====================

CREATE INDEX IF NOT EXISTS idx_conversations_content ON content_conversations(content_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON content_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON conversation_messages(created_at);

-- ====================
-- RLS
-- ====================

ALTER TABLE content_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Org members can read conversations
CREATE POLICY "members_read_conversations" ON content_conversations
  FOR SELECT USING (is_org_member(org_id));

-- Org members can read messages (via conversation org_id)
CREATE POLICY "members_read_messages" ON conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_conversations cc
      WHERE cc.id = conversation_messages.conversation_id
        AND is_org_member(cc.org_id)
    )
  );

-- ====================
-- UPDATED_AT TRIGGERS
-- ====================

CREATE OR REPLACE TRIGGER trg_conversations_updated
  BEFORE UPDATE ON content_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ====================
-- BACKFILL: Create conversation threads for existing content
-- ====================

INSERT INTO content_conversations (org_id, content_id, status)
SELECT gc.org_id, gc.id, 'active'
FROM generated_contents gc
WHERE NOT EXISTS (
  SELECT 1 FROM content_conversations cc WHERE cc.content_id = gc.id
);
