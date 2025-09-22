-- Migration 050: Automated Content Generation Features
-- Purpose: Add automated content generation toggle and enhanced quota tracking

-- ===============================================
-- 1. Add automated content generation flag to websites table
-- ===============================================

ALTER TABLE websites
ADD COLUMN IF NOT EXISTS enable_automated_content BOOLEAN DEFAULT false;

-- Update constraint comments
COMMENT ON COLUMN websites.enable_automated_content IS 'Enable automated content generation for this website (affects cron job processing)';

-- ===============================================
-- 2. Enhance usage tracking for better article quota management
-- ===============================================

-- Add more specific columns to usage_tracking
ALTER TABLE usage_tracking
ADD COLUMN IF NOT EXISTS billing_period_start DATE,
ADD COLUMN IF NOT EXISTS billing_period_end DATE,
ADD COLUMN IF NOT EXISTS quota_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quota_used INTEGER DEFAULT 0;

-- Update comments
COMMENT ON COLUMN usage_tracking.billing_period_start IS 'Start date of the billing period for quota tracking';
COMMENT ON COLUMN usage_tracking.billing_period_end IS 'End date of the billing period for quota tracking';
COMMENT ON COLUMN usage_tracking.quota_limit IS 'Maximum allowed articles for this billing period';
COMMENT ON COLUMN usage_tracking.quota_used IS 'Number of articles generated in this billing period';

-- ===============================================
-- 3. Create article quota management functions
-- ===============================================

-- Function to get current billing period for a user
CREATE OR REPLACE FUNCTION get_current_billing_period(p_user_token VARCHAR(255))
RETURNS TABLE(
    start_date DATE,
    end_date DATE,
    quota_limit INTEGER,
    articles_used INTEGER,
    articles_remaining INTEGER
) AS $$
DECLARE
    user_plan INTEGER;
    period_start DATE;
    period_end DATE;
    plan_limit INTEGER;
    used_count INTEGER;
BEGIN
    -- Get user's current plan
    SELECT plan INTO user_plan FROM login_users WHERE token = p_user_token;

    -- Calculate current billing period (monthly cycle starting from user creation)
    WITH user_created AS (
        SELECT DATE_TRUNC('month', created_at)::DATE as creation_month
        FROM login_users
        WHERE token = p_user_token
    )
    SELECT
        DATE_TRUNC('month', CURRENT_DATE)::DATE,
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
    INTO period_start, period_end;

    -- Set quota limits based on plan
    -- Plan 0 (Free): 1 article/month, Plan 1 (Starter): 10 articles/month, Plan 2+ (Pro/Enterprise): 50 articles/month
    plan_limit := CASE
        WHEN user_plan = 0 THEN 1
        WHEN user_plan = 1 THEN 10
        ELSE 50
    END;

    -- Count articles generated in current period
    SELECT COALESCE(COUNT(*), 0)
    INTO used_count
    FROM articles a
    WHERE a.user_token = p_user_token
    AND a.created_at >= period_start
    AND a.created_at <= period_end + INTERVAL '1 day';

    -- Return results
    RETURN QUERY SELECT
        period_start,
        period_end,
        plan_limit,
        used_count,
        GREATEST(0, plan_limit - used_count);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can generate an article (quota check)
CREATE OR REPLACE FUNCTION can_generate_article(p_user_token VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    remaining_articles INTEGER;
BEGIN
    SELECT articles_remaining
    INTO remaining_articles
    FROM get_current_billing_period(p_user_token);

    RETURN remaining_articles > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to increment article usage count
CREATE OR REPLACE FUNCTION increment_article_usage(p_user_token VARCHAR(255), p_website_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_month VARCHAR(7);
    billing_start DATE;
    billing_end DATE;
    current_limit INTEGER;
BEGIN
    -- Get current billing period info
    SELECT start_date, end_date, quota_limit
    INTO billing_start, billing_end, current_limit
    FROM get_current_billing_period(p_user_token);

    current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

    -- Insert or update usage tracking
    INSERT INTO usage_tracking (
        user_token,
        site_id,
        resource_type,
        month_year,
        count,
        billing_period_start,
        billing_period_end,
        quota_limit,
        quota_used
    ) VALUES (
        p_user_token,
        p_website_id,
        'article',
        current_month,
        1,
        billing_start,
        billing_end,
        current_limit,
        1
    )
    ON CONFLICT (user_token, site_id, resource_type, month_year)
    DO UPDATE SET
        count = usage_tracking.count + 1,
        quota_used = usage_tracking.quota_used + 1,
        updated_at = NOW();

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 4. Enhance content generation queue for better automation
-- ===============================================

-- Add automation-specific columns to queue
ALTER TABLE content_generation_queue
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS generation_method VARCHAR(50) DEFAULT 'manual' CHECK (generation_method IN ('manual', 'automated', 'ai_suggested'));

-- Update comments
COMMENT ON COLUMN content_generation_queue.is_automated IS 'Whether this item was added by automated content generation system';
COMMENT ON COLUMN content_generation_queue.auto_publish IS 'Whether to automatically publish after generation (requires CMS connection)';
COMMENT ON COLUMN content_generation_queue.generation_method IS 'How this queue item was created (manual, automated, ai_suggested)';

-- ===============================================
-- 5. Create view for content dashboard data
-- ===============================================

CREATE OR REPLACE VIEW content_dashboard_summary AS
SELECT
    w.user_token,
    w.website_token,
    w.domain,
    w.enable_automated_content,

    -- Content schedule info
    cs.enabled as scheduling_enabled,
    cs.frequency,
    cs.auto_publish,
    cs.next_scheduled_at,

    -- Queue counts by status
    COUNT(CASE WHEN q.status IN ('draft', 'pending') THEN 1 END) as upcoming_articles,
    COUNT(CASE WHEN q.status = 'generating' THEN 1 END) as generating_articles,
    COUNT(CASE WHEN q.status = 'completed' THEN 1 END) as completed_articles,
    COUNT(CASE WHEN q.generation_method = 'ai_suggested' THEN 1 END) as ai_suggested_ideas,

    -- Recent activity
    MAX(q.completed_at) as last_article_generated,
    MAX(q.scheduled_for) as next_article_due

FROM websites w
LEFT JOIN content_schedules cs ON w.website_token = cs.website_token
LEFT JOIN content_generation_queue q ON w.website_token = q.website_token
WHERE w.is_managed = true
GROUP BY w.user_token, w.website_token, w.domain, w.enable_automated_content,
         cs.enabled, cs.frequency, cs.auto_publish, cs.next_scheduled_at;

-- ===============================================
-- 6. Create indexes for performance
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_websites_automated_content ON websites(enable_automated_content, is_managed) WHERE enable_automated_content = true;
CREATE INDEX IF NOT EXISTS idx_usage_tracking_billing_period ON usage_tracking(user_token, billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_content_queue_automated ON content_generation_queue(is_automated, status, scheduled_for) WHERE is_automated = true;

-- ===============================================
-- 7. Update RLS policies
-- ===============================================

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION get_current_billing_period(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION can_generate_article(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_article_usage(VARCHAR, INTEGER) TO authenticated;

-- Grant access to new view
GRANT SELECT ON content_dashboard_summary TO authenticated;

-- ===============================================
-- 8. Sample data for testing (optional - comment out for production)
-- ===============================================

-- Enable automated content for test domains (uncomment for testing)
-- UPDATE websites SET enable_automated_content = true
-- WHERE domain IN ('translateyoutubevideos.com', 'seoagent.com');