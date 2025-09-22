-- Migration: Update user_plans for new article generation tiers
-- Date: 2025-01-21
-- Purpose: Implement new paid-only article generation plans

BEGIN;

-- Update existing user_plans table structure for new tiers
-- New plan structure:
-- starter: $19/month, 12 articles/month, 1 site
-- pro: $39/month, 30 articles/month, 10 sites
-- scale: $99/month, 90 articles/month, unlimited sites

-- Update tier values and limits for new structure
UPDATE user_plans
SET
    tier = CASE
        WHEN tier = 'starter' THEN 'starter'
        WHEN tier = 'pro' THEN 'pro'
        WHEN tier = 'enterprise' THEN 'scale'
        ELSE 'starter' -- Default any unknown tiers to starter
    END,
    posts_allowed = CASE
        WHEN tier = 'starter' OR tier IS NULL THEN 12  -- 3 articles/week
        WHEN tier = 'pro' THEN 30                      -- 1 article/day
        WHEN tier = 'enterprise' THEN 90               -- 3 articles/day (now 'scale')
        ELSE 12
    END,
    sites_allowed = CASE
        WHEN tier = 'starter' OR tier IS NULL THEN 1
        WHEN tier = 'pro' THEN 10
        WHEN tier = 'enterprise' THEN -1                -- -1 = unlimited
        ELSE 1
    END,
    updated_at = NOW()
WHERE TRUE;

-- Add constraint to ensure no free tiers exist
ALTER TABLE user_plans
ADD CONSTRAINT check_no_free_tier
CHECK (tier IN ('starter', 'pro', 'scale'));

-- Update any NULL tiers to starter (should not exist but safety check)
UPDATE user_plans SET tier = 'starter' WHERE tier IS NULL;

-- Make tier NOT NULL now that we've cleaned up data
ALTER TABLE user_plans ALTER COLUMN tier SET NOT NULL;

-- Add index for faster tier-based queries
CREATE INDEX IF NOT EXISTS idx_user_plans_tier ON user_plans(tier);
CREATE INDEX IF NOT EXISTS idx_user_plans_status_tier ON user_plans(status, tier);

-- Insert default starter plan for any users without plans
-- This handles edge case of users created but no plan assigned
INSERT INTO user_plans (user_token, tier, sites_allowed, posts_allowed, status)
SELECT
    lu.token,
    'starter',
    1,
    12,
    'trial'  -- Start as trial, they'll need to add payment
FROM login_users lu
LEFT JOIN user_plans up ON lu.token = up.user_token
WHERE up.id IS NULL;

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_user_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_plans_updated_at ON user_plans;
CREATE TRIGGER trigger_update_user_plans_updated_at
    BEFORE UPDATE ON user_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_user_plans_updated_at();

COMMIT;

-- Verification queries (run these after migration)
-- SELECT tier, COUNT(*), AVG(posts_allowed), AVG(sites_allowed) FROM user_plans GROUP BY tier;
-- SELECT COUNT(*) as users_without_plans FROM login_users lu LEFT JOIN user_plans up ON lu.token = up.user_token WHERE up.id IS NULL;