-- Migration 041: Add connection status tracking columns to websites table
-- This enables accurate site setup detection for the SEO agent

-- Add connection status columns to websites table
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS gsc_status VARCHAR(20) DEFAULT 'none' CHECK (gsc_status IN ('none', 'connected', 'error')),
ADD COLUMN IF NOT EXISTS seoagentjs_status VARCHAR(20) DEFAULT 'inactive' CHECK (seoagentjs_status IN ('inactive', 'active', 'error')), 
ADD COLUMN IF NOT EXISTS cms_status VARCHAR(20) DEFAULT 'none' CHECK (cms_status IN ('none', 'connected', 'error')),
ADD COLUMN IF NOT EXISTS hosting_status VARCHAR(20) DEFAULT 'none' CHECK (hosting_status IN ('none', 'connected', 'error')),
ADD COLUMN IF NOT EXISTS last_status_check TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_websites_connection_status ON websites(user_token, gsc_status, seoagentjs_status);

-- Update existing websites to have accurate GSC status based on gsc_connections
UPDATE websites 
SET gsc_status = CASE 
  WHEN EXISTS (
    SELECT 1 FROM gsc_connections gc 
    WHERE gc.user_token = websites.user_token 
    AND gc.is_active = true
  ) THEN 'connected'
  ELSE 'none'
END,
last_status_check = NOW()
WHERE gsc_status = 'none';

-- Comment for documentation
COMMENT ON COLUMN websites.gsc_status IS 'Google Search Console connection status: none, connected, error';
COMMENT ON COLUMN websites.seoagentjs_status IS 'SEOAgent.js script installation status: inactive, active, error';
COMMENT ON COLUMN websites.cms_status IS 'CMS connection status: none, connected, error';
COMMENT ON COLUMN websites.hosting_status IS 'Hosting provider connection status: none, connected, error';
COMMENT ON COLUMN websites.last_status_check IS 'Last time connection statuses were verified';