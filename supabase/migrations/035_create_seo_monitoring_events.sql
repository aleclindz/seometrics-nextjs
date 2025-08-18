-- Create SEO Monitoring Events Table for Watchdog System
-- This table tracks all SEO changes, alerts, and fixes across websites

CREATE TABLE seo_monitoring_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    page_url TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'title_change', 'noindex_detected', 'canonical_fix', 'schema_removed', 'h1_change', 'hreflang_added'
    severity VARCHAR(20) NOT NULL, -- 'critical', 'warning', 'info'
    category VARCHAR(30) NOT NULL, -- 'indexability', 'content', 'technical', 'structure'
    title TEXT NOT NULL,
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    auto_fixed BOOLEAN DEFAULT false,
    fix_applied TEXT, -- Description of what fix was applied
    source VARCHAR(20) DEFAULT 'watchdog', -- 'watchdog', 'manual', 'cron'
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_seo_monitoring_events_user_token ON seo_monitoring_events(user_token);
CREATE INDEX idx_seo_monitoring_events_site_url ON seo_monitoring_events(site_url);
CREATE INDEX idx_seo_monitoring_events_event_type ON seo_monitoring_events(event_type);
CREATE INDEX idx_seo_monitoring_events_severity ON seo_monitoring_events(severity);
CREATE INDEX idx_seo_monitoring_events_detected_at ON seo_monitoring_events(detected_at DESC);
CREATE INDEX idx_seo_monitoring_events_unresolved ON seo_monitoring_events(user_token, site_url) WHERE resolved_at IS NULL;

-- Enable RLS (Row Level Security)
ALTER TABLE seo_monitoring_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own SEO monitoring events" ON seo_monitoring_events
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own SEO monitoring events" ON seo_monitoring_events
    FOR INSERT WITH CHECK (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own SEO monitoring events" ON seo_monitoring_events
    FOR UPDATE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_seo_monitoring_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_seo_monitoring_events_updated_at
    BEFORE UPDATE ON seo_monitoring_events
    FOR EACH ROW EXECUTE FUNCTION update_seo_monitoring_events_updated_at();

-- Comments for documentation
COMMENT ON TABLE seo_monitoring_events IS 'Tracks all SEO changes, alerts, and fixes detected by the SEO watchdog system';
COMMENT ON COLUMN seo_monitoring_events.event_type IS 'Type of SEO event: title_change, noindex_detected, canonical_fix, schema_removed, h1_change, hreflang_added, etc.';
COMMENT ON COLUMN seo_monitoring_events.severity IS 'Severity level: critical (indexability issues), warning (content changes), info (minor fixes)';
COMMENT ON COLUMN seo_monitoring_events.category IS 'Category: indexability, content, technical, structure';
COMMENT ON COLUMN seo_monitoring_events.auto_fixed IS 'Whether the issue was automatically fixed by SEOAgent';
COMMENT ON COLUMN seo_monitoring_events.source IS 'Source of detection: watchdog (browser), manual (user action), cron (scheduled)';
COMMENT ON COLUMN seo_monitoring_events.metadata IS 'Additional JSON metadata about the event (selectors, timing, etc.)';