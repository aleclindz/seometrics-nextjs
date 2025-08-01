-- Technical SEO Fixes Table
-- Tracks automated SEO fixes applied to websites

CREATE TABLE IF NOT EXISTS technical_seo_fixes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Site details
    site_url TEXT NOT NULL,
    
    -- Fix details
    fix_types TEXT[] NOT NULL, -- Array of fix types applied
    results JSONB DEFAULT '{}', -- Results of the fix attempt
    
    -- Fix metadata
    status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'partial', 'failed'
    fix_count INTEGER DEFAULT 0, -- Number of individual fixes applied
    
    -- Performance tracking
    duration_ms INTEGER, -- Time taken to apply fixes
    
    -- Timestamps
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_technical_seo_fixes_user_token ON technical_seo_fixes(user_token);
CREATE INDEX IF NOT EXISTS idx_technical_seo_fixes_site_url ON technical_seo_fixes(site_url);
CREATE INDEX IF NOT EXISTS idx_technical_seo_fixes_applied_at ON technical_seo_fixes(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_technical_seo_fixes_status ON technical_seo_fixes(status);

-- Row Level Security (RLS)
ALTER TABLE technical_seo_fixes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own technical SEO fixes" ON technical_seo_fixes
    FOR SELECT USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can create their own technical SEO fixes" ON technical_seo_fixes
    FOR INSERT WITH CHECK (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can update their own technical SEO fixes" ON technical_seo_fixes
    FOR UPDATE USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can delete their own technical SEO fixes" ON technical_seo_fixes
    FOR DELETE USING (user_token = current_setting('app.current_user_token'));