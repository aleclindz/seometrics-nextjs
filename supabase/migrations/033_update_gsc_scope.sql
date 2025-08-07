-- Update GSC scope to allow sitemap submission
-- Change from readonly to full webmasters access for sitemap submission

-- Update the default value for new connections
ALTER TABLE gsc_connections 
ALTER COLUMN scope SET DEFAULT 'https://www.googleapis.com/auth/webmasters';

-- Update existing connections to have the full scope
UPDATE gsc_connections 
SET scope = 'https://www.googleapis.com/auth/webmasters' 
WHERE scope = 'https://www.googleapis.com/auth/webmasters.readonly';