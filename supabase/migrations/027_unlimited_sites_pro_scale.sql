-- Migration: Update Pro and Scale plans to unlimited websites
-- Date: 2025-10-16
-- Description: Updates existing Pro and Scale users to have unlimited websites (sites_allowed = -1)

-- Update all Pro plan users to unlimited sites
UPDATE user_plans
SET
  sites_allowed = -1,
  updated_at = NOW()
WHERE tier = 'pro'
  AND sites_allowed != -1;

-- Update all Scale plan users to unlimited sites (should already be -1, but ensuring consistency)
UPDATE user_plans
SET
  sites_allowed = -1,
  updated_at = NOW()
WHERE tier = 'scale'
  AND sites_allowed != -1;

-- Update all Enterprise plan users to unlimited sites (legacy support)
UPDATE user_plans
SET
  sites_allowed = -1,
  updated_at = NOW()
WHERE tier = 'enterprise'
  AND sites_allowed != -1;

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Updated Pro, Scale, and Enterprise plans to unlimited websites';
END $$;
