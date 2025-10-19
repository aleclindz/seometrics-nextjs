-- Migration 062: Internal Linking System
-- Date: 2025-10-19
-- Purpose: Add internal linking infrastructure to article_briefs and article_queue
--   - Link plans generated during brief creation (strategic relationships)
--   - Actual hyperlinks injected during publishing (when URLs are known)

-- ============================================================================
-- ADD COLUMNS TO article_briefs
-- ============================================================================

-- Add internal_link_plan column to store link strategy
ALTER TABLE article_briefs
ADD COLUMN IF NOT EXISTS internal_link_plan JSONB DEFAULT NULL;

COMMENT ON COLUMN article_briefs.internal_link_plan IS 
'Strategic internal linking plan generated during brief creation. Contains recommended links with target article IDs and anchor text hints. Actual URLs resolved at publish time.';

-- Example structure:
-- {
--   "recommended_links": [
--     {
--       "target_discovery_article_id": "pill_imports_fl",
--       "target_brief_id": 123,
--       "anchor_hint": "comprehensive import guide",
--       "link_type": "pillar|sibling|supporting_to_pillar",
--       "reason": "Links supporting article to pillar"
--     }
--   ],
--   "max_links": 5,
--   "priority_order": ["pillar", "sibling", "supporting_to_pillar"]
-- }

-- ============================================================================
-- ADD COLUMNS TO article_queue AND articles
-- ============================================================================

-- Add injected_internal_links column to track inserted links
ALTER TABLE article_queue
ADD COLUMN IF NOT EXISTS injected_internal_links JSONB DEFAULT NULL;

COMMENT ON COLUMN article_queue.injected_internal_links IS 
'Tracks actual internal links injected into article content during publishing. Contains resolved URLs, anchor text, and metadata.';

-- Also add to articles table (legacy system)
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS injected_internal_links JSONB DEFAULT NULL;

COMMENT ON COLUMN articles.injected_internal_links IS 
'Tracks actual internal links injected into article content during publishing. Contains resolved URLs, anchor text, and metadata.';

-- Example structure:
-- [
--   {
--     "target_url": "/import-guides/comprehensive-florida-import-guide",
--     "anchor_text": "comprehensive import guide",
--     "link_type": "pillar",
--     "inserted_at": "2025-10-18T12:00:00Z",
--     "position_index": 3
--   }
-- ]

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for querying briefs by internal_link_plan existence (for analytics)
CREATE INDEX IF NOT EXISTS idx_article_briefs_has_link_plan
ON article_briefs((internal_link_plan IS NOT NULL))
WHERE internal_link_plan IS NOT NULL;

-- Index for querying articles by injected links (for tracking/analytics)
CREATE INDEX IF NOT EXISTS idx_article_queue_has_injected_links
ON article_queue((injected_internal_links IS NOT NULL))
WHERE injected_internal_links IS NOT NULL;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
-- After this migration:
-- - article_briefs can store link plans with target article references
-- - article_queue tracks which links were actually inserted
-- - Link plans generated during brief creation (knows cluster relationships)
-- - Links injected during publishing (knows actual URLs)
-- - Graceful degradation if target articles aren't published yet

