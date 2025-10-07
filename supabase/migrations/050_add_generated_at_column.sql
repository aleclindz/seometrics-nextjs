-- Migration: Add generated_at column to track when briefs and articles were created/drafted
-- Purpose: Allow users to see and sort by when content was generated

-- ============================================================================
-- 1. ADD generated_at TO article_briefs
-- ============================================================================
-- This tracks when the brief was originally created/drafted
ALTER TABLE article_briefs
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill existing records with created_at value
UPDATE article_briefs
SET generated_at = created_at
WHERE generated_at IS NULL;

-- Add index for sorting/filtering by generation time
CREATE INDEX IF NOT EXISTS idx_article_briefs_generated_at
ON article_briefs(generated_at DESC);

COMMENT ON COLUMN article_briefs.generated_at IS 'When the brief was originally created/drafted by the user or system';

-- ============================================================================
-- 2. ADD generated_at TO article_queue
-- ============================================================================
-- This tracks when the article was generated (not just created in queue)
ALTER TABLE article_queue
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE;

-- Backfill: Set generated_at to created_at for articles with content
UPDATE article_queue
SET generated_at = created_at
WHERE generated_at IS NULL
  AND article_content IS NOT NULL;

-- Add index for sorting/filtering by generation time
CREATE INDEX IF NOT EXISTS idx_article_queue_generated_at
ON article_queue(generated_at DESC)
WHERE generated_at IS NOT NULL;

COMMENT ON COLUMN article_queue.generated_at IS 'When the article content was generated (may differ from created_at for queued articles)';

-- ============================================================================
-- 3. UPDATE content_generation_queue for consistency
-- ============================================================================
-- Add generated_at to content generation queue as well
ALTER TABLE content_generation_queue
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE;

-- Backfill with completed_at for completed items
UPDATE content_generation_queue
SET generated_at = completed_at
WHERE generated_at IS NULL
  AND completed_at IS NOT NULL
  AND status = 'completed';

COMMENT ON COLUMN content_generation_queue.generated_at IS 'When the content was successfully generated';

-- ============================================================================
-- 4. COMPLETION LOG
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 050_add_generated_at_column completed successfully';
    RAISE NOTICE '- Added generated_at to article_briefs (% rows updated)', (SELECT COUNT(*) FROM article_briefs WHERE generated_at IS NOT NULL);
    RAISE NOTICE '- Added generated_at to article_queue (% rows updated)', (SELECT COUNT(*) FROM article_queue WHERE generated_at IS NOT NULL);
    RAISE NOTICE '- Added generated_at to content_generation_queue';
    RAISE NOTICE '- Created 2 performance indexes';
END $$;
