-- Migration: Content Tab Backend Support
-- Purpose: Add tables and columns needed for the new Content Tab dual-mode interface
--
-- This migration:
-- 1. Creates article_briefs table (referenced by existing APIs but never created)
-- 2. Adds missing columns to article_queue for topic clustering and scheduling
-- 3. Adds indexes for performance
-- 4. Sets up RLS policies for security

-- ============================================================================
-- 1. CREATE article_briefs TABLE
-- ============================================================================
-- This table stores article planning documents (briefs) that can be converted to full articles
-- It's already referenced in /api/content/article-briefs-queue and /api/articles/from-brief

CREATE TABLE IF NOT EXISTS article_briefs (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    website_token VARCHAR(255) NOT NULL REFERENCES websites(website_token) ON DELETE CASCADE,

    -- Core content fields
    title VARCHAR(500) NOT NULL,
    h1 VARCHAR(500),
    url_path VARCHAR(500),
    page_type VARCHAR(50) DEFAULT 'blog', -- 'blog', 'cluster', 'pillar', 'service'
    parent_cluster VARCHAR(255), -- Topic cluster this belongs to

    -- SEO targeting fields
    primary_keyword VARCHAR(255) NOT NULL,
    intent VARCHAR(50) DEFAULT 'informational', -- 'informational', 'commercial', 'transactional', 'navigational'
    secondary_keywords JSONB DEFAULT '[]',
    target_queries JSONB DEFAULT '[]',

    -- Content planning
    summary TEXT,
    internal_links JSONB DEFAULT '{}',
    cannibal_risk VARCHAR(20) DEFAULT 'none', -- 'none', 'low', 'medium', 'high'
    cannibal_conflicts JSONB DEFAULT '[]',
    recommendation TEXT,
    canonical_to VARCHAR(500),

    -- Article specifications
    word_count_min INTEGER DEFAULT 1200,
    word_count_max INTEGER DEFAULT 2000,
    tone VARCHAR(50) DEFAULT 'professional', -- 'professional', 'casual', 'academic', 'friendly'
    notes JSONB DEFAULT '[]',

    -- Status tracking
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'queued', 'generating', 'generated', 'failed'
    generated_article_id INTEGER, -- Links to article_queue when generated
    sort_index INTEGER, -- For manual ordering in UI

    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for article_briefs
CREATE INDEX IF NOT EXISTS idx_article_briefs_user_token ON article_briefs(user_token);
CREATE INDEX IF NOT EXISTS idx_article_briefs_website_token ON article_briefs(website_token);
CREATE INDEX IF NOT EXISTS idx_article_briefs_status ON article_briefs(status);
CREATE INDEX IF NOT EXISTS idx_article_briefs_parent_cluster ON article_briefs(parent_cluster);
CREATE INDEX IF NOT EXISTS idx_article_briefs_scheduled_for ON article_briefs(scheduled_for);

-- Add helpful comments
COMMENT ON TABLE article_briefs IS 'Article planning documents (briefs) that can be converted to full articles';
COMMENT ON COLUMN article_briefs.parent_cluster IS 'Topic cluster for organizing related articles';
COMMENT ON COLUMN article_briefs.generated_article_id IS 'Links to article_queue.id when article is generated from this brief';
COMMENT ON COLUMN article_briefs.sort_index IS 'Manual ordering position for UI display';

-- ============================================================================
-- 2. ADD COLUMNS TO article_queue
-- ============================================================================
-- Add topic_cluster for article organization
ALTER TABLE article_queue
ADD COLUMN IF NOT EXISTS topic_cluster VARCHAR(255);

-- Add scheduled_publish_at for calendar scheduling (different from scheduled_for)
-- scheduled_for = when generation should happen
-- scheduled_publish_at = when publishing should happen
ALTER TABLE article_queue
ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP WITH TIME ZONE;

-- Add link back to brief that generated this article
ALTER TABLE article_queue
ADD COLUMN IF NOT EXISTS generated_from_brief_id INTEGER REFERENCES article_briefs(id) ON DELETE SET NULL;

-- Add helpful comments
COMMENT ON COLUMN article_queue.topic_cluster IS 'Topic cluster for organizing related articles in Content Tab';
COMMENT ON COLUMN article_queue.scheduled_publish_at IS 'When article should be automatically published (for calendar scheduling)';
COMMENT ON COLUMN article_queue.generated_from_brief_id IS 'ID of the article_brief that generated this article';

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for topic cluster filtering
CREATE INDEX IF NOT EXISTS idx_article_queue_topic_cluster
ON article_queue(topic_cluster)
WHERE topic_cluster IS NOT NULL;

-- Index for cron job to find articles ready to publish
CREATE INDEX IF NOT EXISTS idx_article_queue_scheduled_publish
ON article_queue(scheduled_publish_at, status)
WHERE scheduled_publish_at IS NOT NULL;

-- Index for looking up articles generated from briefs
CREATE INDEX IF NOT EXISTS idx_article_queue_brief_link
ON article_queue(generated_from_brief_id)
WHERE generated_from_brief_id IS NOT NULL;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on article_briefs
ALTER TABLE article_briefs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (in case of re-running migration)
DROP POLICY IF EXISTS article_briefs_select_own ON article_briefs;
DROP POLICY IF EXISTS article_briefs_insert_own ON article_briefs;
DROP POLICY IF EXISTS article_briefs_update_own ON article_briefs;
DROP POLICY IF EXISTS article_briefs_delete_own ON article_briefs;

-- Policy: Users can view their own briefs
CREATE POLICY article_briefs_select_own ON article_briefs
    FOR SELECT
    USING (user_token = current_setting('app.user_token', true));

-- Policy: Users can insert their own briefs
CREATE POLICY article_briefs_insert_own ON article_briefs
    FOR INSERT
    WITH CHECK (user_token = current_setting('app.user_token', true));

-- Policy: Users can update their own briefs
CREATE POLICY article_briefs_update_own ON article_briefs
    FOR UPDATE
    USING (user_token = current_setting('app.user_token', true));

-- Policy: Users can delete their own briefs
CREATE POLICY article_briefs_delete_own ON article_briefs
    FOR DELETE
    USING (user_token = current_setting('app.user_token', true));

-- ============================================================================
-- 5. UPDATE DATABASE SCHEMA DOCUMENTATION TIMESTAMP
-- ============================================================================

-- Add migration completion log
DO $$
BEGIN
    RAISE NOTICE 'Migration 049_content_tab_backend_support completed successfully';
    RAISE NOTICE '- Created article_briefs table with % rows', (SELECT COUNT(*) FROM article_briefs);
    RAISE NOTICE '- Added columns to article_queue (topic_cluster, scheduled_publish_at, generated_from_brief_id)';
    RAISE NOTICE '- Created 9 performance indexes';
    RAISE NOTICE '- Configured RLS policies for article_briefs';
END $$;
