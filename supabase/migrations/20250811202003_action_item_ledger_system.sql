-- SEO Action Item Ledger System
-- Comprehensive tracking of SEO issues from detection to verified completion

-- Main action items table
CREATE TABLE IF NOT EXISTS seo_action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Site and issue identification
    site_url TEXT NOT NULL,
    issue_type VARCHAR(100) NOT NULL, -- 'indexing_blocked', 'sitemap_missing', 'robots_missing', etc.
    issue_category VARCHAR(50) NOT NULL, -- 'indexing', 'sitemap', 'robots', 'schema', 'mobile', 'performance', 'meta_tags', 'alt_tags'
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
    
    -- Action item details
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact_description TEXT,
    fix_recommendation TEXT,
    
    -- Status tracking
    status VARCHAR(30) NOT NULL DEFAULT 'detected', -- 'detected', 'assigned', 'in_progress', 'completed', 'verified', 'closed', 'dismissed'
    
    -- URLs and references
    affected_urls TEXT[], -- Array of URLs affected by this issue
    reference_id UUID, -- Reference to related record (url_inspection.id, schema_generation.id, etc.)
    reference_table VARCHAR(50), -- Table name of referenced record
    
    -- Lifecycle timestamps
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    next_check_at TIMESTAMP WITH TIME ZONE,
    
    -- Fix tracking
    fix_type VARCHAR(100), -- Type of automated fix applied
    fix_details JSONB, -- Details about the fix that was applied
    verification_status VARCHAR(30), -- 'pending', 'verified', 'failed', 'needs_recheck'
    verification_attempts INTEGER DEFAULT 0,
    verification_details JSONB, -- Details from verification checks
    
    -- Metadata and context
    metadata JSONB DEFAULT '{}', -- Flexible storage for additional context
    priority_score INTEGER DEFAULT 50, -- 0-100 priority score for sorting
    estimated_impact VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
    estimated_effort VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('detected', 'assigned', 'in_progress', 'completed', 'verified', 'closed', 'dismissed')),
    CONSTRAINT valid_severity CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT valid_category CHECK (issue_category IN ('indexing', 'sitemap', 'robots', 'schema', 'mobile', 'performance', 'meta_tags', 'alt_tags', 'core_vitals', 'security'))
);

-- Enhance sitemap_submissions table with Google verification tracking
ALTER TABLE sitemap_submissions ADD COLUMN IF NOT EXISTS google_download_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE sitemap_submissions ADD COLUMN IF NOT EXISTS google_last_downloaded TIMESTAMP WITH TIME ZONE;
ALTER TABLE sitemap_submissions ADD COLUMN IF NOT EXISTS google_processing_status VARCHAR(50) DEFAULT 'submitted';
ALTER TABLE sitemap_submissions ADD COLUMN IF NOT EXISTS google_processed_urls INTEGER DEFAULT 0;
ALTER TABLE sitemap_submissions ADD COLUMN IF NOT EXISTS google_warnings INTEGER DEFAULT 0;
ALTER TABLE sitemap_submissions ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;
ALTER TABLE sitemap_submissions ADD COLUMN IF NOT EXISTS next_verification_check TIMESTAMP WITH TIME ZONE;
ALTER TABLE sitemap_submissions ADD COLUMN IF NOT EXISTS verification_details JSONB DEFAULT '{}';

-- Enhance robots_analyses table with Google fetch status tracking
ALTER TABLE robots_analyses ADD COLUMN IF NOT EXISTS google_fetch_status VARCHAR(50) DEFAULT 'unknown';
ALTER TABLE robots_analyses ADD COLUMN IF NOT EXISTS google_last_fetched TIMESTAMP WITH TIME ZONE;
ALTER TABLE robots_analyses ADD COLUMN IF NOT EXISTS google_fetch_errors INTEGER DEFAULT 0;
ALTER TABLE robots_analyses ADD COLUMN IF NOT EXISTS google_fetch_details JSONB DEFAULT '{}';
ALTER TABLE robots_analyses ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE robots_analyses ADD COLUMN IF NOT EXISTS next_verification_check TIMESTAMP WITH TIME ZONE;
ALTER TABLE robots_analyses ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

-- Add action_item_id to technical_seo_fixes to link fixes to action items
ALTER TABLE technical_seo_fixes ADD COLUMN IF NOT EXISTS action_item_id UUID REFERENCES seo_action_items(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seo_action_items_user_token ON seo_action_items(user_token);
CREATE INDEX IF NOT EXISTS idx_seo_action_items_site_url ON seo_action_items(site_url);
CREATE INDEX IF NOT EXISTS idx_seo_action_items_status ON seo_action_items(status);
CREATE INDEX IF NOT EXISTS idx_seo_action_items_category ON seo_action_items(issue_category);
CREATE INDEX IF NOT EXISTS idx_seo_action_items_severity ON seo_action_items(severity);
CREATE INDEX IF NOT EXISTS idx_seo_action_items_priority ON seo_action_items(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_seo_action_items_detected_at ON seo_action_items(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_action_items_next_check ON seo_action_items(next_check_at) WHERE next_check_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seo_action_items_reference ON seo_action_items(reference_id, reference_table);

-- Compound indexes for common queries
CREATE INDEX IF NOT EXISTS idx_seo_action_items_user_site_status ON seo_action_items(user_token, site_url, status);
CREATE INDEX IF NOT EXISTS idx_seo_action_items_user_site_category ON seo_action_items(user_token, site_url, issue_category);

-- Updated_at triggers
CREATE TRIGGER update_seo_action_items_updated_at 
    BEFORE UPDATE ON seo_action_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE seo_action_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for seo_action_items
CREATE POLICY "Users can view their own action items" ON seo_action_items
    FOR SELECT USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can create their own action items" ON seo_action_items
    FOR INSERT WITH CHECK (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can update their own action items" ON seo_action_items
    FOR UPDATE USING (user_token = current_setting('app.current_user_token'));

CREATE POLICY "Users can delete their own action items" ON seo_action_items
    FOR DELETE USING (user_token = current_setting('app.current_user_token'));

-- Function to automatically update action item timestamps based on status changes
CREATE OR REPLACE FUNCTION update_action_item_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Update timestamps based on status changes
    IF NEW.status != OLD.status THEN
        CASE NEW.status
            WHEN 'assigned' THEN
                NEW.assigned_at = NOW();
            WHEN 'in_progress' THEN
                NEW.started_at = NOW();
            WHEN 'completed' THEN
                NEW.completed_at = NOW();
                -- Schedule verification check in 24 hours
                NEW.next_check_at = NOW() + INTERVAL '24 hours';
            WHEN 'verified' THEN
                NEW.verified_at = NOW();
                NEW.next_check_at = NULL;
            WHEN 'dismissed' THEN
                NEW.dismissed_at = NOW();
                NEW.next_check_at = NULL;
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER trigger_update_action_item_timestamps
    BEFORE UPDATE ON seo_action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_action_item_timestamps();

-- Function to calculate priority score based on severity, impact, and age
CREATE OR REPLACE FUNCTION calculate_action_item_priority(
    severity_level VARCHAR,
    estimated_impact_level VARCHAR,
    detected_timestamp TIMESTAMP WITH TIME ZONE,
    affected_url_count INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
    base_score INTEGER := 50;
    severity_bonus INTEGER := 0;
    impact_bonus INTEGER := 0;
    age_bonus INTEGER := 0;
    url_bonus INTEGER := 0;
    age_days INTEGER;
BEGIN
    -- Severity scoring
    CASE severity_level
        WHEN 'critical' THEN severity_bonus := 40;
        WHEN 'high' THEN severity_bonus := 25;
        WHEN 'medium' THEN severity_bonus := 10;
        WHEN 'low' THEN severity_bonus := 0;
    END CASE;
    
    -- Impact scoring
    CASE estimated_impact_level
        WHEN 'high' THEN impact_bonus := 20;
        WHEN 'medium' THEN impact_bonus := 10;
        WHEN 'low' THEN impact_bonus := 5;
    END CASE;
    
    -- Age bonus (older issues get higher priority)
    age_days := EXTRACT(DAY FROM NOW() - detected_timestamp);
    age_bonus := LEAST(age_days, 30); -- Cap at 30 days
    
    -- Multiple URL bonus
    url_bonus := LEAST((affected_url_count - 1) * 2, 10); -- Cap at 10 points
    
    RETURN LEAST(base_score + severity_bonus + impact_bonus + age_bonus + url_bonus, 100);
END;
$$ LANGUAGE plpgsql;

-- View for active action items with calculated priorities
CREATE OR REPLACE VIEW active_action_items AS
SELECT 
    ai.*,
    calculate_action_item_priority(
        ai.severity,
        ai.estimated_impact,
        ai.detected_at,
        COALESCE(array_length(ai.affected_urls, 1), 1)
    ) as calculated_priority,
    CASE 
        WHEN ai.status = 'detected' THEN 'New Issue'
        WHEN ai.status = 'assigned' THEN 'Assigned'
        WHEN ai.status = 'in_progress' THEN 'In Progress'
        WHEN ai.status = 'completed' THEN 'Awaiting Verification'
        ELSE 'Other'
    END as status_display,
    EXTRACT(DAYS FROM NOW() - ai.detected_at)::INTEGER as days_old
FROM seo_action_items ai
WHERE ai.status NOT IN ('verified', 'closed', 'dismissed')
ORDER BY calculated_priority DESC, ai.detected_at ASC;

-- View for completed action items audit trail
CREATE OR REPLACE VIEW completed_action_items AS
SELECT 
    ai.*,
    tsf.applied_at as fix_applied_at,
    tsf.details as fix_details_applied,
    EXTRACT(DAYS FROM ai.completed_at - ai.detected_at)::INTEGER as resolution_days
FROM seo_action_items ai
LEFT JOIN technical_seo_fixes tsf ON tsf.action_item_id = ai.id
WHERE ai.status IN ('verified', 'closed')
ORDER BY ai.verified_at DESC, ai.completed_at DESC;

COMMENT ON TABLE seo_action_items IS 'Comprehensive tracking of SEO issues from detection through verified completion';
COMMENT ON COLUMN seo_action_items.priority_score IS 'Calculated priority score (0-100) for issue sorting and urgency';
COMMENT ON COLUMN seo_action_items.verification_status IS 'Status of post-completion verification (e.g., checking if Google processed the fix)';
COMMENT ON COLUMN seo_action_items.reference_id IS 'Links to source data record that detected this issue';
COMMENT ON FUNCTION calculate_action_item_priority IS 'Calculates priority score based on severity, impact, age, and scope';