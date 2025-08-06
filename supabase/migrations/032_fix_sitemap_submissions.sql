-- Fix sitemap_submissions table schema
-- Add missing columns that the sitemap generation API expects

ALTER TABLE sitemap_submissions 
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sitemap_content TEXT,
ADD COLUMN IF NOT EXISTS url_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gsc_property TEXT;

-- Update the unique constraint to be more specific
-- Drop the old constraint and create a new one without sitemap_url
ALTER TABLE sitemap_submissions 
DROP CONSTRAINT IF EXISTS sitemap_submissions_user_token_site_url_sitemap_url_key;

-- Create a new unique constraint on user_token and site_url only
ALTER TABLE sitemap_submissions 
ADD CONSTRAINT sitemap_submissions_user_token_site_url_key 
UNIQUE(user_token, site_url);

-- Update index to include generated_at for better performance
CREATE INDEX IF NOT EXISTS idx_sitemap_submissions_generated_at ON sitemap_submissions(generated_at DESC);