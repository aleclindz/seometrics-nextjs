-- Row Level Security policies for Article Generation System
-- Ensures users can only access their own CMS connections, analysis, and articles

-- Enable RLS on all new tables
ALTER TABLE cms_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- CMS Connections policies
CREATE POLICY "Users can view own CMS connections" ON cms_connections
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own CMS connections" ON cms_connections
    FOR INSERT WITH CHECK (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own CMS connections" ON cms_connections
    FOR UPDATE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own CMS connections" ON cms_connections
    FOR DELETE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- Website Analysis policies
CREATE POLICY "Users can view own website analysis" ON website_analysis
    FOR SELECT USING (
        website_id IN (
            SELECT w.id FROM websites w
            JOIN login_users u ON w.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own website analysis" ON website_analysis
    FOR INSERT WITH CHECK (
        website_id IN (
            SELECT w.id FROM websites w
            JOIN login_users u ON w.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own website analysis" ON website_analysis
    FOR UPDATE USING (
        website_id IN (
            SELECT w.id FROM websites w
            JOIN login_users u ON w.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Article Queue policies
CREATE POLICY "Users can view own article queue" ON article_queue
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own article queue items" ON article_queue
    FOR INSERT WITH CHECK (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own article queue items" ON article_queue
    FOR UPDATE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own article queue items" ON article_queue
    FOR DELETE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- Article Images policies
CREATE POLICY "Users can view own article images" ON article_images
    FOR SELECT USING (
        article_queue_id IN (
            SELECT aq.id FROM article_queue aq
            JOIN login_users u ON aq.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own article images" ON article_images
    FOR INSERT WITH CHECK (
        article_queue_id IN (
            SELECT aq.id FROM article_queue aq
            JOIN login_users u ON aq.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Article Generation Logs policies (read-only for users)
CREATE POLICY "Users can view own article generation logs" ON article_generation_logs
    FOR SELECT USING (
        article_queue_id IN (
            SELECT aq.id FROM article_queue aq
            JOIN login_users u ON aq.user_token = u.token
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Content Templates policies (public read access)
CREATE POLICY "All users can view content templates" ON content_templates
    FOR SELECT USING (is_active = true);

-- Service role policies (full access for API operations)
CREATE POLICY "Service can manage CMS connections" ON cms_connections
    FOR ALL USING (true);

CREATE POLICY "Service can manage website analysis" ON website_analysis
    FOR ALL USING (true);

CREATE POLICY "Service can manage article queue" ON article_queue
    FOR ALL USING (true);

CREATE POLICY "Service can manage article images" ON article_images
    FOR ALL USING (true);

CREATE POLICY "Service can manage generation logs" ON article_generation_logs
    FOR ALL USING (true);

CREATE POLICY "Service can manage content templates" ON content_templates
    FOR ALL USING (true);