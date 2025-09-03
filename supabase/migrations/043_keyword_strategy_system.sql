-- Keyword Strategy and Internal Linking System
-- This migration creates the infrastructure for storing keyword strategies and managing internal links

-- Main keyword storage with topic cluster organization
CREATE TABLE website_keywords (
    id SERIAL PRIMARY KEY,
    website_token TEXT NOT NULL REFERENCES websites(website_token) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    keyword_type TEXT NOT NULL CHECK (keyword_type IN ('primary', 'secondary', 'long_tail')),
    topic_cluster TEXT, -- for internal linking strategy
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(website_token, keyword)
);

-- Track content for each topic cluster (for internal linking)
CREATE TABLE topic_cluster_content (
    id SERIAL PRIMARY KEY,
    website_token TEXT NOT NULL REFERENCES websites(website_token) ON DELETE CASCADE,
    topic_cluster TEXT NOT NULL,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    article_url TEXT, -- for existing content not in our system
    article_title TEXT,
    primary_keyword TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track internal links created by the agent
CREATE TABLE internal_links (
    id SERIAL PRIMARY KEY,
    website_token TEXT NOT NULL REFERENCES websites(website_token) ON DELETE CASCADE,
    source_article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    target_article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    target_url TEXT, -- for external/existing content
    anchor_text TEXT NOT NULL,
    topic_cluster TEXT,
    link_context TEXT, -- surrounding text context where link was placed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure we have either target_article_id OR target_url, but not both
    CONSTRAINT internal_links_target_check CHECK (
        (target_article_id IS NOT NULL AND target_url IS NULL) OR
        (target_article_id IS NULL AND target_url IS NOT NULL)
    )
);

-- Add indexes for performance
CREATE INDEX idx_website_keywords_website_token ON website_keywords(website_token);
CREATE INDEX idx_website_keywords_topic_cluster ON website_keywords(website_token, topic_cluster);
CREATE INDEX idx_website_keywords_keyword_type ON website_keywords(keyword_type);

CREATE INDEX idx_topic_cluster_content_website_token ON topic_cluster_content(website_token);
CREATE INDEX idx_topic_cluster_content_cluster ON topic_cluster_content(website_token, topic_cluster);
CREATE INDEX idx_topic_cluster_content_article ON topic_cluster_content(article_id);

CREATE INDEX idx_internal_links_website_token ON internal_links(website_token);
CREATE INDEX idx_internal_links_source_article ON internal_links(source_article_id);
CREATE INDEX idx_internal_links_target_article ON internal_links(target_article_id);
CREATE INDEX idx_internal_links_topic_cluster ON internal_links(website_token, topic_cluster);

-- Add updated_at trigger for website_keywords
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER set_timestamp_website_keywords
    BEFORE UPDATE ON website_keywords
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_topic_cluster_content
    BEFORE UPDATE ON topic_cluster_content
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_internal_links
    BEFORE UPDATE ON internal_links
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS
ALTER TABLE website_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_cluster_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for website_keywords
CREATE POLICY "Users can view their own website keywords" ON website_keywords
    FOR SELECT USING (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

CREATE POLICY "Users can insert keywords for their websites" ON website_keywords
    FOR INSERT WITH CHECK (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

CREATE POLICY "Users can update their own website keywords" ON website_keywords
    FOR UPDATE USING (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

CREATE POLICY "Users can delete their own website keywords" ON website_keywords
    FOR DELETE USING (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

-- RLS Policies for topic_cluster_content
CREATE POLICY "Users can view their own topic cluster content" ON topic_cluster_content
    FOR SELECT USING (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

CREATE POLICY "Users can insert topic cluster content for their websites" ON topic_cluster_content
    FOR INSERT WITH CHECK (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

CREATE POLICY "Users can update their own topic cluster content" ON topic_cluster_content
    FOR UPDATE USING (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

CREATE POLICY "Users can delete their own topic cluster content" ON topic_cluster_content
    FOR DELETE USING (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

-- RLS Policies for internal_links
CREATE POLICY "Users can view their own internal links" ON internal_links
    FOR SELECT USING (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

CREATE POLICY "Users can insert internal links for their websites" ON internal_links
    FOR INSERT WITH CHECK (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

CREATE POLICY "Users can update their own internal links" ON internal_links
    FOR UPDATE USING (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

CREATE POLICY "Users can delete their own internal links" ON internal_links
    FOR DELETE USING (
        website_token IN (
            SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
        )
    );

-- Admin policies for all tables
CREATE POLICY "Admin can view all keywords" ON website_keywords
    FOR SELECT USING (current_setting('role', true) = 'admin');

CREATE POLICY "Admin can view all topic cluster content" ON topic_cluster_content
    FOR SELECT USING (current_setting('role', true) = 'admin');

CREATE POLICY "Admin can view all internal links" ON internal_links
    FOR SELECT USING (current_setting('role', true) = 'admin');

-- Utility views for easier querying

-- View to get keyword strategy overview by website
CREATE VIEW website_keyword_strategy AS
SELECT 
    wk.website_token,
    w.domain,
    wk.topic_cluster,
    COUNT(*) as keyword_count,
    COUNT(*) FILTER (WHERE wk.keyword_type = 'primary') as primary_keywords,
    COUNT(*) FILTER (WHERE wk.keyword_type = 'secondary') as secondary_keywords,
    COUNT(*) FILTER (WHERE wk.keyword_type = 'long_tail') as long_tail_keywords,
    STRING_AGG(DISTINCT wk.keyword, ', ' ORDER BY wk.keyword) as keywords
FROM website_keywords wk
JOIN websites w ON wk.website_token = w.website_token
GROUP BY wk.website_token, w.domain, wk.topic_cluster;

-- View to get topic cluster content overview
CREATE VIEW topic_cluster_overview AS
SELECT 
    tcc.website_token,
    w.domain,
    tcc.topic_cluster,
    COUNT(DISTINCT tcc.id) as content_count,
    COUNT(DISTINCT wk.keyword) as keyword_count,
    COUNT(DISTINCT il.id) as internal_links_count,
    STRING_AGG(DISTINCT tcc.article_title, '; ' ORDER BY tcc.article_title) as articles,
    STRING_AGG(DISTINCT wk.keyword, ', ' ORDER BY wk.keyword) as keywords
FROM topic_cluster_content tcc
JOIN websites w ON tcc.website_token = w.website_token
LEFT JOIN website_keywords wk ON tcc.website_token = wk.website_token AND tcc.topic_cluster = wk.topic_cluster
LEFT JOIN internal_links il ON tcc.website_token = il.website_token AND tcc.topic_cluster = il.topic_cluster
GROUP BY tcc.website_token, w.domain, tcc.topic_cluster;

-- View to get internal linking opportunities (content that could be linked but isn't)
CREATE VIEW internal_linking_opportunities AS
SELECT DISTINCT
    t1.website_token,
    w.domain,
    t1.topic_cluster,
    t1.article_id as source_article_id,
    t1.article_title as source_title,
    t2.article_id as target_article_id,
    t2.article_title as target_title,
    wk.keyword as suggested_anchor_text
FROM topic_cluster_content t1
JOIN topic_cluster_content t2 ON t1.website_token = t2.website_token 
    AND t1.topic_cluster = t2.topic_cluster 
    AND t1.article_id != t2.article_id
JOIN websites w ON t1.website_token = w.website_token
LEFT JOIN website_keywords wk ON t1.website_token = wk.website_token 
    AND t1.topic_cluster = wk.topic_cluster
LEFT JOIN internal_links il ON t1.article_id = il.source_article_id 
    AND t2.article_id = il.target_article_id
WHERE il.id IS NULL -- No existing link between these articles
    AND t1.article_id IS NOT NULL 
    AND t2.article_id IS NOT NULL;