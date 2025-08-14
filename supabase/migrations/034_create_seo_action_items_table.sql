-- Create SEO Action Items table for tracking detected SEO issues and their resolution
-- This table stores all detected SEO issues and tracks their lifecycle from detection to completion

CREATE TABLE public.seo_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    issue_category VARCHAR(50) NOT NULL CHECK (issue_category IN ('indexing', 'sitemap', 'robots', 'schema', 'mobile', 'performance', 'meta_tags', 'alt_tags', 'core_vitals', 'security')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact_description TEXT,
    fix_recommendation TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'assigned', 'in_progress', 'completed', 'verified', 'closed', 'dismissed')),
    affected_urls TEXT[] DEFAULT '{}',
    reference_id VARCHAR(255),
    reference_table VARCHAR(100),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    next_check_at TIMESTAMP WITH TIME ZONE,
    fix_type VARCHAR(100),
    fix_details JSONB DEFAULT '{}',
    verification_status VARCHAR(20) CHECK (verification_status IN ('pending', 'verified', 'failed', 'needs_recheck')),
    verification_attempts INTEGER DEFAULT 0,
    verification_details JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    priority_score INTEGER DEFAULT 50,
    estimated_impact VARCHAR(20) CHECK (estimated_impact IN ('high', 'medium', 'low')),
    estimated_effort VARCHAR(20) CHECK (estimated_effort IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_seo_action_items_user_token ON public.seo_action_items(user_token);
CREATE INDEX idx_seo_action_items_site_url ON public.seo_action_items(site_url);
CREATE INDEX idx_seo_action_items_status ON public.seo_action_items(status);
CREATE INDEX idx_seo_action_items_severity ON public.seo_action_items(severity);
CREATE INDEX idx_seo_action_items_category ON public.seo_action_items(issue_category);
CREATE INDEX idx_seo_action_items_priority ON public.seo_action_items(priority_score DESC);
CREATE INDEX idx_seo_action_items_detected_at ON public.seo_action_items(detected_at);

-- Composite index for common queries
CREATE INDEX idx_seo_action_items_user_site_status ON public.seo_action_items(user_token, site_url, status);

-- Add unique constraint to prevent duplicate issues
CREATE UNIQUE INDEX idx_seo_action_items_unique_issue ON public.seo_action_items(user_token, site_url, issue_type, issue_category) 
WHERE status NOT IN ('verified', 'closed', 'dismissed');

-- Enable RLS
ALTER TABLE public.seo_action_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user access
CREATE POLICY "Users can access their own action items" ON public.seo_action_items
    FOR ALL USING (
        user_token IN (
            SELECT token FROM login_users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_seo_action_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_seo_action_items_updated_at_trigger
    BEFORE UPDATE ON public.seo_action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_action_items_updated_at();

-- Add comment
COMMENT ON TABLE public.seo_action_items IS 'Tracks SEO issues detected on websites and their resolution progress through the action items system';