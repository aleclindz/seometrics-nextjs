-- CMS Integration System Database Schema
-- Modular 1-click CMS connections for WordPress, Webflow, and Shopify

-- OAuth states table for temporary storage during OAuth flows
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    cms_type TEXT NOT NULL CHECK (cms_type IN ('wordpress', 'webflow', 'shopify')),
    state TEXT NOT NULL UNIQUE,
    redirect_uri TEXT NOT NULL,
    site_url TEXT, -- For WordPress and Shopify
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_type_state ON oauth_states(user_id, cms_type, state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Enhanced CMS connections table (replacing the existing simple one)
DROP TABLE IF EXISTS cms_connections CASCADE;

CREATE TABLE cms_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('wordpress', 'webflow', 'shopify')),
    name TEXT NOT NULL,
    credentials JSONB NOT NULL, -- Stores access tokens, site URLs, etc.
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cms_connections_user_id ON cms_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_cms_connections_user_type ON cms_connections(user_id, type);
CREATE INDEX IF NOT EXISTS idx_cms_connections_active ON cms_connections(user_id, is_active);

-- CMS blogs/collections table
CREATE TABLE IF NOT EXISTS cms_blogs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES cms_connections(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL, -- Blog ID from the CMS
    name TEXT NOT NULL,
    url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_cms_blogs_connection_id ON cms_blogs(connection_id);
CREATE INDEX IF NOT EXISTS idx_cms_blogs_active ON cms_blogs(connection_id, is_active);

-- CMS articles sync table (for tracking published articles)
CREATE TABLE IF NOT EXISTS cms_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES cms_connections(id) ON DELETE CASCADE,
    blog_id UUID REFERENCES cms_blogs(id) ON DELETE SET NULL,
    article_queue_id UUID REFERENCES article_queue(id) ON DELETE SET NULL,
    external_id TEXT NOT NULL, -- Article ID from the CMS
    title TEXT NOT NULL,
    slug TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
    published_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
    sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_cms_articles_connection_id ON cms_articles(connection_id);
CREATE INDEX IF NOT EXISTS idx_cms_articles_article_queue_id ON cms_articles(article_queue_id);
CREATE INDEX IF NOT EXISTS idx_cms_articles_sync_status ON cms_articles(sync_status);

-- Update the existing article_queue table to link with CMS connections
ALTER TABLE article_queue ADD COLUMN IF NOT EXISTS cms_connection_id UUID REFERENCES cms_connections(id) ON DELETE SET NULL;
ALTER TABLE article_queue ADD COLUMN IF NOT EXISTS target_blog_id UUID REFERENCES cms_blogs(id) ON DELETE SET NULL;
ALTER TABLE article_queue ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT false;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_article_queue_cms_connection ON article_queue(cms_connection_id);
CREATE INDEX IF NOT EXISTS idx_article_queue_target_blog ON article_queue(target_blog_id);

-- RLS Policies for security
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_articles ENABLE ROW LEVEL SECURITY;

-- OAuth states policies (temporary data, more permissive)
CREATE POLICY "Users can manage their own OAuth states" ON oauth_states
    FOR ALL USING (true); -- OAuth states are temporary and cleaned up

-- CMS connections policies
CREATE POLICY "Users can view their own CMS connections" ON cms_connections
    FOR SELECT USING (user_id = current_setting('app.current_user_id')::text);

CREATE POLICY "Users can insert their own CMS connections" ON cms_connections
    FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id')::text);

CREATE POLICY "Users can update their own CMS connections" ON cms_connections
    FOR UPDATE USING (user_id = current_setting('app.current_user_id')::text);

CREATE POLICY "Users can delete their own CMS connections" ON cms_connections
    FOR DELETE USING (user_id = current_setting('app.current_user_id')::text);

-- CMS blogs policies
CREATE POLICY "Users can access blogs through their connections" ON cms_blogs
    FOR ALL USING (
        connection_id IN (
            SELECT id FROM cms_connections 
            WHERE user_id = current_setting('app.current_user_id')::text
        )
    );

-- CMS articles policies
CREATE POLICY "Users can access articles through their connections" ON cms_articles
    FOR ALL USING (
        connection_id IN (
            SELECT id FROM cms_connections 
            WHERE user_id = current_setting('app.current_user_id')::text
        )
    );

-- Function to clean up expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
    DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired OAuth states (runs every hour)
-- Note: This requires pg_cron extension, which may not be available in all environments
-- SELECT cron.schedule('cleanup-oauth-states', '0 * * * *', 'SELECT cleanup_expired_oauth_states();');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cms_connections_updated_at
    BEFORE UPDATE ON cms_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_blogs_updated_at
    BEFORE UPDATE ON cms_blogs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_articles_updated_at
    BEFORE UPDATE ON cms_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();