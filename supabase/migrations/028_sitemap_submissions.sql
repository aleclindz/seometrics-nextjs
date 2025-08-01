-- Sitemap Submissions Table
-- Tracks sitemap submissions to Google Search Console

CREATE TABLE IF NOT EXISTS sitemap_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Site and sitemap details
    site_url TEXT NOT NULL,
    sitemap_url TEXT NOT NULL,
    
    -- Submission details
    status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'processed', 'error', 'deleted'
    submission_method VARCHAR(20) DEFAULT 'api', -- 'api', 'manual'
    
    -- Google response data
    warnings INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    last_downloaded TIMESTAMP WITH TIME ZONE,
    is_pending BOOLEAN DEFAULT true,
    is_sitemaps_index BOOLEAN DEFAULT false,
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique submissions per user/site/sitemap combination
    UNIQUE(user_token, site_url, sitemap_url)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sitemap_submissions_user_token ON sitemap_submissions(user_token);
CREATE INDEX IF NOT EXISTS idx_sitemap_submissions_site_url ON sitemap_submissions(site_url);
CREATE INDEX IF NOT EXISTS idx_sitemap_submissions_status ON sitemap_submissions(status);
CREATE INDEX IF NOT EXISTS idx_sitemap_submissions_submitted_at ON sitemap_submissions(submitted_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_sitemap_submissions_updated_at 
    BEFORE UPDATE ON sitemap_submissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE sitemap_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sitemap submissions" ON sitemap_submissions
    FOR SELECT USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can create their own sitemap submissions" ON sitemap_submissions
    FOR INSERT WITH CHECK (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can update their own sitemap submissions" ON sitemap_submissions
    FOR UPDATE USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can delete their own sitemap submissions" ON sitemap_submissions
    FOR DELETE USING (user_token = current_setting('app.current_user_token'));