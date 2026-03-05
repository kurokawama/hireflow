-- Phase B2: Add automated collection support to target_lists
-- Adds collection_criteria JSONB column for storing auto-collection settings

ALTER TABLE target_lists
ADD COLUMN IF NOT EXISTS collection_criteria JSONB DEFAULT NULL;

COMMENT ON COLUMN target_lists.collection_criteria IS 'Auto-collection criteria: {keywords, age_min, age_max, location, platforms, score_threshold, max_results_per_keyword}';
