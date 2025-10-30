-- Migration: Add Free Access System
-- Description: Allow admins to grant free Pro access to users without Stripe subscription
-- Created: 2025-10-30

-- Add free_until column to user_plans table
ALTER TABLE user_plans
ADD COLUMN IF NOT EXISTS free_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS free_granted_by VARCHAR(255), -- Admin email who granted it
ADD COLUMN IF NOT EXISTS free_granted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS free_reason TEXT; -- Why free access was granted

-- Create index for efficient free access queries
CREATE INDEX IF NOT EXISTS idx_user_plans_free_until ON user_plans(free_until) WHERE free_until IS NOT NULL;

-- Add comment explaining the free access system
COMMENT ON COLUMN user_plans.free_until IS 'Date until which user has free Pro access. Checked before Stripe subscription.';
COMMENT ON COLUMN user_plans.free_granted_by IS 'Email of admin who granted free access';
COMMENT ON COLUMN user_plans.free_granted_at IS 'Timestamp when free access was granted';
COMMENT ON COLUMN user_plans.free_reason IS 'Reason for granting free access (e.g., beta tester, partner, compensation)';

-- Create audit log table for free access grants
CREATE TABLE IF NOT EXISTS free_access_grants (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    granted_by VARCHAR(255) NOT NULL, -- Admin email
    months_granted INTEGER NOT NULL,
    previous_free_until TIMESTAMP WITH TIME ZONE,
    new_free_until TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_free_access_grants_user_token ON free_access_grants(user_token);
CREATE INDEX IF NOT EXISTS idx_free_access_grants_created_at ON free_access_grants(created_at DESC);

-- Add RLS policies for audit table (admin only access)
ALTER TABLE free_access_grants ENABLE ROW LEVEL SECURITY;

-- Function to grant free months to a user
CREATE OR REPLACE FUNCTION grant_free_months(
    p_user_token VARCHAR(255),
    p_months INTEGER,
    p_granted_by VARCHAR(255),
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_current_free_until TIMESTAMP WITH TIME ZONE;
    v_new_free_until TIMESTAMP WITH TIME ZONE;
    v_user_plan_exists BOOLEAN;
BEGIN
    -- Check if user has a plan record
    SELECT EXISTS(SELECT 1 FROM user_plans WHERE user_token = p_user_token) INTO v_user_plan_exists;

    -- Get current free_until date (if any)
    SELECT free_until INTO v_current_free_until
    FROM user_plans
    WHERE user_token = p_user_token;

    -- Calculate new free_until date
    -- If they already have free access, extend from that date, otherwise from now
    IF v_current_free_until IS NOT NULL AND v_current_free_until > NOW() THEN
        v_new_free_until := v_current_free_until + (p_months || ' months')::INTERVAL;
    ELSE
        v_new_free_until := NOW() + (p_months || ' months')::INTERVAL;
    END IF;

    -- Create or update user_plans record
    IF v_user_plan_exists THEN
        UPDATE user_plans
        SET
            free_until = v_new_free_until,
            free_granted_by = p_granted_by,
            free_granted_at = NOW(),
            free_reason = p_reason,
            tier = 'pro', -- Set to pro tier while they have free access
            updated_at = NOW()
        WHERE user_token = p_user_token;
    ELSE
        INSERT INTO user_plans (
            user_token,
            tier,
            sites_allowed,
            posts_allowed,
            status,
            free_until,
            free_granted_by,
            free_granted_at,
            free_reason
        ) VALUES (
            p_user_token,
            'pro',
            10, -- Pro plan allows 10 sites
            100, -- Pro plan allows 100 posts
            'active',
            v_new_free_until,
            p_granted_by,
            NOW(),
            p_reason
        );
    END IF;

    -- Log the grant in audit table
    INSERT INTO free_access_grants (
        user_token,
        granted_by,
        months_granted,
        previous_free_until,
        new_free_until,
        reason
    ) VALUES (
        p_user_token,
        p_granted_by,
        p_months,
        v_current_free_until,
        v_new_free_until,
        p_reason
    );

    -- Return success with details
    RETURN jsonb_build_object(
        'success', true,
        'previous_free_until', v_current_free_until,
        'new_free_until', v_new_free_until,
        'months_granted', p_months,
        'granted_by', p_granted_by
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has active free access
CREATE OR REPLACE FUNCTION has_active_free_access(p_user_token VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    v_free_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT free_until INTO v_free_until
    FROM user_plans
    WHERE user_token = p_user_token;

    RETURN v_free_until IS NOT NULL AND v_free_until > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to revoke free access
CREATE OR REPLACE FUNCTION revoke_free_access(
    p_user_token VARCHAR(255),
    p_revoked_by VARCHAR(255),
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_previous_free_until TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current free_until
    SELECT free_until INTO v_previous_free_until
    FROM user_plans
    WHERE user_token = p_user_token;

    -- Clear free access fields
    UPDATE user_plans
    SET
        free_until = NULL,
        free_granted_by = NULL,
        free_granted_at = NULL,
        free_reason = NULL,
        updated_at = NOW()
    WHERE user_token = p_user_token;

    -- Log the revocation
    INSERT INTO free_access_grants (
        user_token,
        granted_by,
        months_granted,
        previous_free_until,
        new_free_until,
        reason
    ) VALUES (
        p_user_token,
        p_revoked_by,
        0, -- 0 months = revocation
        v_previous_free_until,
        NULL,
        'REVOKED: ' || COALESCE(p_reason, 'No reason provided')
    );

    RETURN jsonb_build_object(
        'success', true,
        'previous_free_until', v_previous_free_until,
        'revoked_by', p_revoked_by
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for active free access users
CREATE OR REPLACE VIEW active_free_access_users AS
SELECT
    up.user_token,
    lu.email,
    up.tier,
    up.free_until,
    up.free_granted_by,
    up.free_granted_at,
    up.free_reason,
    EXTRACT(DAY FROM (up.free_until - NOW())) as days_remaining
FROM user_plans up
JOIN login_users lu ON lu.token = up.user_token
WHERE up.free_until IS NOT NULL
  AND up.free_until > NOW()
ORDER BY up.free_until ASC;

COMMENT ON VIEW active_free_access_users IS 'Users with currently active free Pro access';
