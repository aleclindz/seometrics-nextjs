-- Migration 061: Strategy Flow Optimization
-- Date: 2025-10-10
-- Purpose: Optimize database for strategy→content flow completion
--   - Remove legacy views that are no longer used
--   - Add performance indexes for cron job queries

-- ============================================================================
-- DROP LEGACY VIEWS
-- ============================================================================

-- Drop article_briefs_view_legacy (replaced by direct article_briefs queries)
DROP VIEW IF EXISTS article_briefs_view_legacy CASCADE;
-- Reason: Legacy view from old article brief system, replaced by updated API queries
-- that join with article_roles and topic_clusters

-- Drop keyword_coverage_overview (can be recreated if needed)
DROP VIEW IF EXISTS keyword_coverage_overview CASCADE;
-- Reason: View was created in Migration 057 but is not actively used
-- Can be recreated from website_keywords + keyword_mentions if needed later

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Index for cron job that processes scheduled briefs
-- Cron query: SELECT * FROM article_briefs WHERE status='queued' AND scheduled_for <= NOW()
CREATE INDEX IF NOT EXISTS idx_article_briefs_cron_scheduling
ON article_briefs(status, scheduled_for)
WHERE status = 'queued';
-- Reason: Optimizes cron job query in /api/cron/generate-scheduled-content
-- Partial index only on queued briefs for maximum efficiency

-- Index for Content Tab queries that order by cluster and role
CREATE INDEX IF NOT EXISTS idx_article_briefs_cluster_role
ON article_briefs(topic_cluster_id, article_role)
WHERE status IN ('draft', 'queued', 'generating');
-- Reason: Optimizes Content Tab API query ordering
-- Partial index only on active briefs (excludes completed/published)

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
-- After this migration:
-- - Removed 2 legacy views
-- - Added 2 performance indexes for cron and Content Tab
-- - All strategy→content flow is now optimized
-- - Cron job queries will be significantly faster
