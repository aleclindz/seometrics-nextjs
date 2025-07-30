-- Website Management System
-- Add columns to support selective website management and exclusion from sync

-- Add management and exclusion columns to websites table
ALTER TABLE websites 
ADD COLUMN is_managed BOOLEAN DEFAULT false,
ADD COLUMN is_excluded_from_sync BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_websites_managed ON websites(user_token, is_managed);
CREATE INDEX idx_websites_excluded ON websites(user_token, is_excluded_from_sync);

-- Update existing websites to be managed (up to plan limits)
-- This will be handled by application logic during migration

-- Add helpful comments
COMMENT ON COLUMN websites.is_managed IS 'Whether this website is actively managed by SEOAgent (subject to plan limits)';
COMMENT ON COLUMN websites.is_excluded_from_sync IS 'Whether this website should be excluded from future GSC syncs (soft delete)';