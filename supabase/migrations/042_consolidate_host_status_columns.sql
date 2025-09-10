-- Consolidate host_status and hosting_status columns
-- This migration fixes the duplicate status columns issue

-- First, copy any non-null values from host_status to hosting_status
UPDATE websites 
SET hosting_status = host_status 
WHERE host_status IS NOT NULL 
  AND host_status != 'none' 
  AND (hosting_status IS NULL OR hosting_status = 'none');

-- Drop the old host_status column since hosting_status is the canonical one
-- (from migration 041 which is newer and has proper constraints)
ALTER TABLE websites DROP COLUMN IF EXISTS host_status;

-- Add comment to clarify this is the canonical hosting status column
COMMENT ON COLUMN websites.hosting_status IS 'Hosting provider connection status: none, connected, error (consolidated from host_status)';