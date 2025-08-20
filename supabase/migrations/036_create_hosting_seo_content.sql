-- Create hosting_seo_content table for proxy-based SEO file serving
-- This table stores sitemap and robots.txt content for the redirect deployment method

CREATE TABLE hosting_seo_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_token TEXT NOT NULL,
    domain TEXT NOT NULL,
    sitemap_content TEXT,
    robots_content TEXT,
    provider TEXT NOT NULL DEFAULT 'unknown',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_token, domain),
    CHECK (sitemap_content IS NOT NULL OR robots_content IS NOT NULL)
);

-- Indexes for efficient querying
CREATE INDEX idx_hosting_seo_content_user_domain ON hosting_seo_content(user_token, domain);
CREATE INDEX idx_hosting_seo_content_domain ON hosting_seo_content(domain);
CREATE INDEX idx_hosting_seo_content_status ON hosting_seo_content(status);
CREATE INDEX idx_hosting_seo_content_provider ON hosting_seo_content(provider);
CREATE INDEX idx_hosting_seo_content_updated_at ON hosting_seo_content(updated_at);

-- Row Level Security (RLS)
ALTER TABLE hosting_seo_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own SEO content" ON hosting_seo_content
    FOR ALL USING (auth.uid()::text = user_token);

-- Allow service role full access for API operations
CREATE POLICY "Service role full access to SEO content" ON hosting_seo_content
    FOR ALL TO service_role USING (true);

-- Comments for documentation
COMMENT ON TABLE hosting_seo_content IS 'Storage for sitemap and robots.txt content used by hosting provider proxy deployments';
COMMENT ON COLUMN hosting_seo_content.user_token IS 'User identifier from auth system';
COMMENT ON COLUMN hosting_seo_content.domain IS 'Domain name (without protocol) for which content is stored';
COMMENT ON COLUMN hosting_seo_content.sitemap_content IS 'Complete XML sitemap content';
COMMENT ON COLUMN hosting_seo_content.robots_content IS 'Complete robots.txt content';
COMMENT ON COLUMN hosting_seo_content.provider IS 'Hosting provider that requested storage (vercel, netlify, etc.)';
COMMENT ON COLUMN hosting_seo_content.status IS 'Content status: active (served by proxy) or inactive (archived)';

-- Update updated_at on changes
CREATE OR REPLACE FUNCTION update_hosting_seo_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hosting_seo_content_updated_at
    BEFORE UPDATE ON hosting_seo_content
    FOR EACH ROW
    EXECUTE FUNCTION update_hosting_seo_content_updated_at();