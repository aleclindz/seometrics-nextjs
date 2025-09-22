-- Migration 051: Fix quota calculation to use new plan system
-- Purpose: Update quota functions to use user_plans table instead of old plan column

-- Drop and recreate the billing period function with correct plan logic
DROP FUNCTION IF EXISTS get_current_billing_period(VARCHAR);

CREATE OR REPLACE FUNCTION get_current_billing_period(p_user_token VARCHAR(255))
RETURNS TABLE(
    start_date DATE,
    end_date DATE,
    quota_limit INTEGER,
    articles_used INTEGER,
    articles_remaining INTEGER
) AS $$
DECLARE
    user_plan_tier TEXT;
    period_start DATE;
    period_end DATE;
    plan_limit INTEGER;
    used_count INTEGER;
BEGIN
    -- Get user's current plan from user_plans table
    SELECT up.tier INTO user_plan_tier
    FROM user_plans up
    JOIN login_users lu ON up.user_token = lu.token
    WHERE lu.token = p_user_token
    ORDER BY up.created_at DESC
    LIMIT 1;

    -- If no plan found, default to free
    IF user_plan_tier IS NULL THEN
        user_plan_tier := 'free';
    END IF;

    -- Calculate current billing period (monthly cycle)
    SELECT
        DATE_TRUNC('month', CURRENT_DATE)::DATE,
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
    INTO period_start, period_end;

    -- Set quota limits based on new plan system
    -- Free: 0 articles, Starter: unlimited, Pro: unlimited, Enterprise: unlimited
    plan_limit := CASE
        WHEN user_plan_tier = 'free' THEN 0
        WHEN user_plan_tier = 'starter' THEN -1  -- Unlimited
        WHEN user_plan_tier = 'pro' THEN -1      -- Unlimited
        WHEN user_plan_tier = 'enterprise' THEN -1 -- Unlimited
        ELSE 0 -- Default to free
    END;

    -- Count articles generated in current period
    SELECT COALESCE(COUNT(*), 0)
    INTO used_count
    FROM articles a
    WHERE a.user_token = p_user_token
    AND a.created_at >= period_start
    AND a.created_at <= period_end + INTERVAL '1 day';

    -- Calculate remaining articles
    DECLARE
        remaining_articles INTEGER;
    BEGIN
        IF plan_limit = -1 THEN
            remaining_articles := -1; -- Unlimited
        ELSE
            remaining_articles := GREATEST(0, plan_limit - used_count);
        END IF;

        -- Return results
        RETURN QUERY SELECT
            period_start,
            period_end,
            plan_limit,
            used_count,
            remaining_articles;
    END;
END;
$$ LANGUAGE plpgsql;

-- Update the can_generate_article function
DROP FUNCTION IF EXISTS can_generate_article(VARCHAR);

CREATE OR REPLACE FUNCTION can_generate_article(p_user_token VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    remaining_articles INTEGER;
BEGIN
    SELECT articles_remaining
    INTO remaining_articles
    FROM get_current_billing_period(p_user_token);

    -- If unlimited (-1) or has remaining articles, allow generation
    RETURN remaining_articles = -1 OR remaining_articles > 0;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_current_billing_period(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION can_generate_article(VARCHAR) TO authenticated;