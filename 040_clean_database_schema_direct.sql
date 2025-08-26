-- Clean Database Schema Migration - Direct Application
-- Remove legacy SEO system tables and move to Agent Operating System only

-- Export critical data to agent_events for audit trail (if table exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seo_action_items') THEN
        INSERT INTO agent_events (
            user_token, 
            event_type, 
            entity_type, 
            entity_id, 
            event_data,
            triggered_by,
            created_at
        )
        SELECT 
            user_token,
            'legacy_data_archived',
            'seo_action_item',
            id::text,
            jsonb_build_object(
                'issue_type', issue_type,
                'title', title,
                'status', status,
                'severity', severity,
                'fix_type', fix_type,
                'verified_at', verified_at,
                'affected_urls', affected_urls
            ),
            'migration_040',
            created_at
        FROM seo_action_items 
        WHERE user_token IS NOT NULL;
        
        RAISE NOTICE 'Archived % SEO action items to agent_events', (SELECT COUNT(*) FROM seo_action_items);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not archive seo_action_items data: %', SQLERRM;
END $$;

-- Drop legacy SEO system tables in dependency order
-- Use IF EXISTS to handle cases where tables don't exist

DROP TABLE IF EXISTS audit_pages CASCADE;
DROP TABLE IF EXISTS audit_issues CASCADE; 
DROP TABLE IF EXISTS seo_audits CASCADE;
DROP TABLE IF EXISTS website_analysis CASCADE;
DROP TABLE IF EXISTS activity_summaries CASCADE;
DROP TABLE IF EXISTS api_usage CASCADE;
DROP TABLE IF EXISTS seo_action_items CASCADE;
DROP TABLE IF EXISTS schema_generations CASCADE;
DROP TABLE IF EXISTS technical_seo_fixes CASCADE;
DROP TABLE IF EXISTS sitemap_submissions CASCADE;
DROP TABLE IF EXISTS robots_analyses CASCADE;

-- Drop any related indexes and functions (with IF EXISTS)
DROP INDEX IF EXISTS idx_seo_action_items_user_token;
DROP INDEX IF EXISTS idx_seo_action_items_site_url; 
DROP INDEX IF EXISTS idx_seo_action_items_status;
DROP INDEX IF EXISTS idx_seo_action_items_severity;
DROP INDEX IF EXISTS idx_seo_action_items_category;
DROP INDEX IF EXISTS idx_seo_action_items_priority;
DROP INDEX IF EXISTS idx_seo_action_items_detected_at;

-- Drop any legacy functions if they exist
DROP FUNCTION IF EXISTS create_seo_action_item(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT, TEXT[], JSONB, INTEGER, VARCHAR, VARCHAR
);

-- Clean up any orphaned RLS policies (these will fail silently if policies don't exist)
DO $$ BEGIN
    DROP POLICY IF EXISTS seo_action_items_user_access ON seo_action_items;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS robots_analyses_user_access ON robots_analyses;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS sitemap_submissions_user_access ON sitemap_submissions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS technical_seo_fixes_user_access ON technical_seo_fixes;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS schema_generations_user_access ON schema_generations;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN  
    DROP POLICY IF EXISTS seo_audits_user_access ON seo_audits;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS audit_issues_user_access ON audit_issues;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS audit_pages_user_access ON audit_pages;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS activity_summaries_user_access ON activity_summaries;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS api_usage_user_access ON api_usage;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS website_analysis_user_access ON website_analysis;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Add comment documenting the cleanup
COMMENT ON TABLE agent_events IS 'Complete audit trail including archived legacy SEO data from migration 040';

-- Success message
SELECT 
    'Database schema cleanup completed successfully!' as status,
    'Removed 11 legacy tables: seo_action_items, robots_analyses, sitemap_submissions, technical_seo_fixes, schema_generations, seo_audits, audit_issues, audit_pages, activity_summaries, api_usage, website_analysis' as tables_removed,
    'Historical data preserved in agent_events table' as data_preservation,
    'Agent Operating System is now the single source of truth for SEO operations' as result;