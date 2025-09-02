-- Enhanced Article Generation Fields Migration
-- This migration adds support for the new enhanced article generation features

-- Add new columns to article_queue table for enhanced features
ALTER TABLE article_queue 
ADD COLUMN IF NOT EXISTS article_type TEXT DEFAULT 'blog',
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS citations JSONB,
ADD COLUMN IF NOT EXISTS images JSONB,
ADD COLUMN IF NOT EXISTS schema_json JSONB;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_article_queue_article_type ON article_queue(article_type);
CREATE INDEX IF NOT EXISTS idx_article_queue_slug ON article_queue(slug);

-- Update RLS policies to include new fields
-- Note: The existing RLS policies should already cover these new fields since they're on the same table

-- Add some useful comments
COMMENT ON COLUMN article_queue.article_type IS 'Type of article: how_to, listicle, guide, faq, comparison, evergreen, blog';
COMMENT ON COLUMN article_queue.slug IS 'URL-friendly slug generated from title';
COMMENT ON COLUMN article_queue.citations IS 'Array of research sources used in the article with title, url, source, published date';
COMMENT ON COLUMN article_queue.images IS 'Array of generated/fetched images with url, alt text, provider, attribution';
COMMENT ON COLUMN article_queue.schema_json IS 'JSON-LD structured data for the article (HowTo, FAQPage, ItemList, etc.)';

-- Example schema structures for documentation:
-- citations example: [{"title": "Study Title", "url": "https://...", "source": "Journal", "published": "2024"}]
-- images example: [{"url": "https://...", "alt": "Description", "provider": "openai", "attribution": "Generated"}]
-- schema_json example: {"@context": "https://schema.org", "@type": "HowTo", "name": "Title", "step": [...]}

-- Migration validation
DO $$
BEGIN
  -- Check if columns were added successfully
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'article_queue' AND column_name = 'article_type'
  ) THEN
    RAISE EXCEPTION 'Migration failed: article_type column not added';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'article_queue' AND column_name = 'citations'
  ) THEN
    RAISE EXCEPTION 'Migration failed: citations column not added';
  END IF;
  
  RAISE NOTICE 'Enhanced article fields migration completed successfully';
END
$$;