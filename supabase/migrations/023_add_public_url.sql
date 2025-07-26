-- Migration: Add public URL column to article_queue table
-- This allows us to store the live article URL for users to view published content

-- Add public_url column to article_queue table
ALTER TABLE article_queue 
ADD COLUMN public_url TEXT;

-- Add index for potential queries
CREATE INDEX idx_article_queue_public_url ON article_queue(public_url) WHERE public_url IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN article_queue.public_url IS 'Public URL where the article can be viewed live on the website';