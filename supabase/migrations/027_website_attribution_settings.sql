-- Website Attribution Settings
-- Add column to control SEOAgent attribution link display

-- Add attribution control column to websites table
ALTER TABLE websites 
ADD COLUMN attribution_enabled BOOLEAN DEFAULT true;

-- Create index for better query performance
CREATE INDEX idx_websites_attribution ON websites(user_token, attribution_enabled);

-- Add helpful comments
COMMENT ON COLUMN websites.attribution_enabled IS 'Whether SEOAgent attribution link should be displayed on this website (default: true)';