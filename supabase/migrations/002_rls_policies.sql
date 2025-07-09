-- Row Level Security (RLS) policies
-- Ensures users can only access their own data

-- Enable RLS on all tables
ALTER TABLE login_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON login_users
    FOR SELECT USING (auth.jwt() ->> 'user_token' = token);

CREATE POLICY "Users can update own profile" ON login_users
    FOR UPDATE USING (auth.jwt() ->> 'user_token' = token);

-- Websites policies
CREATE POLICY "Users can view own websites" ON websites
    FOR SELECT USING (auth.jwt() ->> 'user_token' = user_token);

CREATE POLICY "Users can insert own websites" ON websites
    FOR INSERT WITH CHECK (auth.jwt() ->> 'user_token' = user_token);

CREATE POLICY "Users can update own websites" ON websites
    FOR UPDATE USING (auth.jwt() ->> 'user_token' = user_token);

CREATE POLICY "Users can delete own websites" ON websites
    FOR DELETE USING (auth.jwt() ->> 'user_token' = user_token);

-- Pages policies (through website ownership)
CREATE POLICY "Users can view pages of own websites" ON pages
    FOR SELECT USING (
        website_token IN (
            SELECT website_token FROM websites 
            WHERE user_token = auth.jwt() ->> 'user_token'
        )
    );

CREATE POLICY "Users can insert pages for own websites" ON pages
    FOR INSERT WITH CHECK (
        website_token IN (
            SELECT website_token FROM websites 
            WHERE user_token = auth.jwt() ->> 'user_token'
        )
    );

CREATE POLICY "Users can update pages of own websites" ON pages
    FOR UPDATE USING (
        website_token IN (
            SELECT website_token FROM websites 
            WHERE user_token = auth.jwt() ->> 'user_token'
        )
    );

-- Images policies (through website ownership)
CREATE POLICY "Users can view images of own websites" ON images
    FOR SELECT USING (
        website_token IN (
            SELECT website_token FROM websites 
            WHERE user_token = auth.jwt() ->> 'user_token'
        )
    );

CREATE POLICY "Users can insert images for own websites" ON images
    FOR INSERT WITH CHECK (
        website_token IN (
            SELECT website_token FROM websites 
            WHERE user_token = auth.jwt() ->> 'user_token'
        )
    );

CREATE POLICY "Users can update images of own websites" ON images
    FOR UPDATE USING (
        website_token IN (
            SELECT website_token FROM websites 
            WHERE user_token = auth.jwt() ->> 'user_token'
        )
    );

-- Articles policies
CREATE POLICY "Users can view own articles" ON articles
    FOR SELECT USING (auth.jwt() ->> 'user_token' = user_token);

CREATE POLICY "Users can insert own articles" ON articles
    FOR INSERT WITH CHECK (auth.jwt() ->> 'user_token' = user_token);

CREATE POLICY "Users can update own articles" ON articles
    FOR UPDATE USING (auth.jwt() ->> 'user_token' = user_token);

CREATE POLICY "Users can delete own articles" ON articles
    FOR DELETE USING (auth.jwt() ->> 'user_token' = user_token);

-- API usage policies
CREATE POLICY "Users can view own API usage" ON api_usage
    FOR SELECT USING (auth.jwt() ->> 'user_token' = user_token);

CREATE POLICY "Service can insert API usage" ON api_usage
    FOR INSERT WITH CHECK (true); -- Allow service to insert usage data