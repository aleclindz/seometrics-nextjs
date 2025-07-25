-- Migration: Add CMS admin URL column to article_queue table
-- This allows us to store deep-link URLs to edit published articles in CMS admin

-- Add cms_admin_url column to article_queue table
ALTER TABLE article_queue 
ADD COLUMN cms_admin_url TEXT;

-- Add index for potential queries
CREATE INDEX idx_article_queue_cms_admin_url ON article_queue(cms_admin_url) WHERE cms_admin_url IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN article_queue.cms_admin_url IS 'Deep-link URL to edit this article in the CMS admin interface';