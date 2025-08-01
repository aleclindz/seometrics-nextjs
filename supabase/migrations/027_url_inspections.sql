-- URL Inspections Table
-- Stores results from GSC URL Inspection API for technical SEO monitoring

CREATE TABLE IF NOT EXISTS url_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Site and URL details
    site_url TEXT NOT NULL,
    inspected_url TEXT NOT NULL,
    
    -- Index status information
    index_status VARCHAR(50) NOT NULL, -- 'PASS', 'FAIL', 'PARTIAL', etc.
    can_be_indexed BOOLEAN DEFAULT false,
    
    -- Canonical information
    google_canonical TEXT,
    user_canonical TEXT,
    sitemap TEXT,
    
    -- Fetch information
    fetch_status VARCHAR(50), -- 'SUCCESS', 'SOFT_404', 'ACCESS_DENIED', etc.
    last_crawl_time TIMESTAMP WITH TIME ZONE,
    robots_txt_state VARCHAR(50), -- 'ALLOWED', 'DISALLOWED', etc.
    
    -- Mobile usability
    mobile_usable BOOLEAN DEFAULT false,
    mobile_usability_issues INTEGER DEFAULT 0,
    
    -- Rich results (structured data)
    rich_results_items INTEGER DEFAULT 0,
    rich_results_valid BOOLEAN DEFAULT false,
    
    -- AMP information
    amp_url TEXT,
    amp_status VARCHAR(50),
    
    -- Raw inspection data from Google API
    inspection_data JSONB DEFAULT '{}',
    
    -- Metadata
    inspected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique inspections per user/site/url combination
    UNIQUE(user_token, site_url, inspected_url)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_url_inspections_user_token ON url_inspections(user_token);
CREATE INDEX IF NOT EXISTS idx_url_inspections_site_url ON url_inspections(site_url);
CREATE INDEX IF NOT EXISTS idx_url_inspections_index_status ON url_inspections(index_status);
CREATE INDEX IF NOT EXISTS idx_url_inspections_can_be_indexed ON url_inspections(can_be_indexed);
CREATE INDEX IF NOT EXISTS idx_url_inspections_mobile_usable ON url_inspections(mobile_usable);
CREATE INDEX IF NOT EXISTS idx_url_inspections_rich_results ON url_inspections(rich_results_items);
CREATE INDEX IF NOT EXISTS idx_url_inspections_inspected_at ON url_inspections(inspected_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_url_inspections_updated_at 
    BEFORE UPDATE ON url_inspections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE url_inspections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own URL inspections" ON url_inspections
    FOR SELECT USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can create their own URL inspections" ON url_inspections
    FOR INSERT WITH CHECK (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can update their own URL inspections" ON url_inspections
    FOR UPDATE USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can delete their own URL inspections" ON url_inspections
    FOR DELETE USING (user_token = current_setting('app.current_user_token'));