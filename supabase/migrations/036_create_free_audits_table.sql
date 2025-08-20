-- Create free_audits table for standalone audit tool (no authentication required)
-- This supports the lead magnet free audit functionality

CREATE TABLE free_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_url TEXT NOT NULL,
    email TEXT, -- Optional email for report delivery
    audit_results JSONB NOT NULL DEFAULT '{}',
    overall_score INTEGER, -- 0-100
    total_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    warning_issues INTEGER DEFAULT 0,
    fixable_by_agent INTEGER DEFAULT 0, -- Issues SEOAgent can automatically fix
    ip_address INET, -- For rate limiting
    user_agent TEXT, -- Track audit source
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_free_audits_website_url ON free_audits(website_url);
CREATE INDEX idx_free_audits_created_at ON free_audits(created_at);
CREATE INDEX idx_free_audits_ip_address ON free_audits(ip_address, created_at);
CREATE INDEX idx_free_audits_email ON free_audits(email) WHERE email IS NOT NULL;

-- Add constraint to prevent spam
CREATE INDEX idx_free_audits_rate_limiting ON free_audits(ip_address, DATE(created_at));

-- No RLS policies needed - this table is accessed without authentication
-- and rate limiting will be handled at the application level

-- Add comments for documentation
COMMENT ON TABLE free_audits IS 'Stores results from free SEO audits for lead generation';
COMMENT ON COLUMN free_audits.audit_results IS 'JSON object containing detailed audit findings';
COMMENT ON COLUMN free_audits.fixable_by_agent IS 'Number of issues that SEOAgent can automatically fix';
COMMENT ON COLUMN free_audits.ip_address IS 'IP address for rate limiting (max 3 audits per day per IP)';