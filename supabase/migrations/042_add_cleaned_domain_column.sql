-- Migration 042: Add cleaned_domain column to websites table
-- This eliminates sc-domain: prefix issues throughout the system

-- Add cleaned_domain column to websites table
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS cleaned_domain VARCHAR(255);

-- Populate existing records with cleaned domains (remove sc-domain: prefix)
UPDATE websites 
SET cleaned_domain = REGEXP_REPLACE(domain, '^sc-domain:', '', 'g')
WHERE cleaned_domain IS NULL OR cleaned_domain = '';

-- Create function to automatically clean domain on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_cleaned_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove sc-domain: prefix and other common prefixes to create clean domain
  NEW.cleaned_domain = REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(NEW.domain, '^sc-domain:', '', 'g'),
      '^https?://', '', 'g'
    ),
    '^www\.', '', 'g'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate cleaned_domain on INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_update_cleaned_domain ON websites;
CREATE TRIGGER trigger_update_cleaned_domain
  BEFORE INSERT OR UPDATE ON websites
  FOR EACH ROW EXECUTE FUNCTION update_cleaned_domain();

-- Create index for efficient queries on cleaned_domain
CREATE INDEX IF NOT EXISTS idx_websites_cleaned_domain ON websites(cleaned_domain);
CREATE INDEX IF NOT EXISTS idx_websites_user_cleaned_domain ON websites(user_token, cleaned_domain);

-- Comment for documentation
COMMENT ON COLUMN websites.cleaned_domain IS 'Clean domain without sc-domain:, https://, or www. prefixes - used for URL construction';
COMMENT ON FUNCTION update_cleaned_domain() IS 'Automatically populates cleaned_domain column by removing prefixes from domain column';
COMMENT ON TRIGGER trigger_update_cleaned_domain ON websites IS 'Ensures cleaned_domain is always up-to-date when domain changes';