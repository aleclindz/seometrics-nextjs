-- SEO Audit System
-- Tables for managing website audits and tracking issues

-- SEO audits table for storing audit runs
CREATE TABLE IF NOT EXISTS seo_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    website_id UUID, -- References GSC property or manual website
    
    -- Audit details
    website_url TEXT NOT NULL,
    audit_type VARCHAR(50) DEFAULT 'full', -- 'full', 'technical', 'content', 'performance'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    
    -- Progress tracking
    pages_crawled INTEGER DEFAULT 0,
    pages_total INTEGER DEFAULT 0,
    current_step VARCHAR(100),
    progress_percentage INTEGER DEFAULT 0,
    
    -- Results summary
    overall_score INTEGER, -- 0-100 score
    total_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    warning_issues INTEGER DEFAULT 0,
    info_issues INTEGER DEFAULT 0,
    
    -- Audit metadata
    user_agent TEXT DEFAULT 'SEOAgent/1.0 (+https://seoagent.com)',
    crawl_depth INTEGER DEFAULT 3,
    max_pages INTEGER DEFAULT 100,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB DEFAULT '{}',
    
    -- Performance metrics
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit issues table for storing individual problems found
CREATE TABLE IF NOT EXISTS audit_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES seo_audits(id) ON DELETE CASCADE,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Issue details
    page_url TEXT NOT NULL,
    issue_type VARCHAR(100) NOT NULL, -- 'meta_title_missing', 'meta_description_long', 'broken_link', etc.
    severity VARCHAR(20) NOT NULL, -- 'critical', 'warning', 'info'
    category VARCHAR(50) NOT NULL, -- 'technical', 'content', 'performance', 'accessibility'
    
    -- Issue description
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    
    -- Issue context
    element_selector TEXT, -- CSS selector for the problematic element
    element_content TEXT, -- The actual content that's problematic
    expected_content TEXT, -- What it should be
    
    -- Issue metrics
    impact_score INTEGER DEFAULT 0, -- 1-10 impact rating
    fix_difficulty VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'fixed', 'ignored'
    fixed_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional data
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit pages table for tracking crawled pages
CREATE TABLE IF NOT EXISTS audit_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES seo_audits(id) ON DELETE CASCADE,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Page details
    url TEXT NOT NULL,
    title TEXT,
    meta_description TEXT,
    status_code INTEGER,
    
    -- Page metrics
    load_time_ms INTEGER,
    content_size_bytes INTEGER,
    word_count INTEGER,
    
    -- SEO metrics
    h1_count INTEGER DEFAULT 0,
    h2_count INTEGER DEFAULT 0,
    h3_count INTEGER DEFAULT 0,
    internal_links INTEGER DEFAULT 0,
    external_links INTEGER DEFAULT 0,
    images_count INTEGER DEFAULT 0,
    images_without_alt INTEGER DEFAULT 0,
    
    -- Page analysis
    has_meta_title BOOLEAN DEFAULT false,
    has_meta_description BOOLEAN DEFAULT false,
    has_h1 BOOLEAN DEFAULT false,
    has_canonical BOOLEAN DEFAULT false,
    is_indexable BOOLEAN DEFAULT true,
    
    -- Performance scores
    lighthouse_performance INTEGER, -- 0-100
    lighthouse_seo INTEGER, -- 0-100
    lighthouse_accessibility INTEGER, -- 0-100
    
    -- Raw data
    page_content TEXT, -- Store limited content for analysis
    response_headers JSONB DEFAULT '{}',
    lighthouse_data JSONB DEFAULT '{}',
    
    -- Timestamps
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seo_audits_user_token ON seo_audits(user_token);
CREATE INDEX IF NOT EXISTS idx_seo_audits_website_url ON seo_audits(website_url);
CREATE INDEX IF NOT EXISTS idx_seo_audits_status ON seo_audits(status);
CREATE INDEX IF NOT EXISTS idx_seo_audits_created_at ON seo_audits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_issues_audit_id ON audit_issues(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_issues_user_token ON audit_issues(user_token);
CREATE INDEX IF NOT EXISTS idx_audit_issues_severity ON audit_issues(severity);
CREATE INDEX IF NOT EXISTS idx_audit_issues_category ON audit_issues(category);
CREATE INDEX IF NOT EXISTS idx_audit_issues_status ON audit_issues(status);

CREATE INDEX IF NOT EXISTS idx_audit_pages_audit_id ON audit_pages(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_pages_user_token ON audit_pages(user_token);
CREATE INDEX IF NOT EXISTS idx_audit_pages_url ON audit_pages(url);
CREATE INDEX IF NOT EXISTS idx_audit_pages_status_code ON audit_pages(status_code);

-- Updated_at triggers
CREATE TRIGGER update_seo_audits_updated_at 
    BEFORE UPDATE ON seo_audits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_issues_updated_at 
    BEFORE UPDATE ON audit_issues 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies for seo_audits
CREATE POLICY "Users can view their own audits" ON seo_audits
    FOR SELECT USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can create their own audits" ON seo_audits
    FOR INSERT WITH CHECK (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can update their own audits" ON seo_audits
    FOR UPDATE USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can delete their own audits" ON seo_audits
    FOR DELETE USING (user_token = current_setting('app.current_user_token'));

-- RLS policies for audit_issues
CREATE POLICY "Users can view their own audit issues" ON audit_issues
    FOR SELECT USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can create their own audit issues" ON audit_issues
    FOR INSERT WITH CHECK (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can update their own audit issues" ON audit_issues
    FOR UPDATE USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can delete their own audit issues" ON audit_issues
    FOR DELETE USING (user_token = current_setting('app.current_user_token'));

-- RLS policies for audit_pages
CREATE POLICY "Users can view their own audit pages" ON audit_pages
    FOR SELECT USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can create their own audit pages" ON audit_pages
    FOR INSERT WITH CHECK (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can update their own audit pages" ON audit_pages
    FOR UPDATE USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can delete their own audit pages" ON audit_pages
    FOR DELETE USING (user_token = current_setting('app.current_user_token'));