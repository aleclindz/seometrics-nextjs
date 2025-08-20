-- ================================================
-- HOSTING PROVIDER FINGERPRINTS TABLE
-- ================================================
-- This table stores dynamic fingerprints for hosting provider detection
-- Allows for runtime updates without code deployments

CREATE TABLE IF NOT EXISTS hosting_provider_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50) NOT NULL, -- 'cdn', 'hosting', 'platform', 'cms'
    fingerprint_type VARCHAR(50) NOT NULL, -- 'header', 'dns', 'ssl', 'path', 'ip_range'
    fingerprint_key VARCHAR(255) NOT NULL, -- header name, DNS type, path, etc.
    fingerprint_value TEXT NOT NULL, -- pattern or exact match value
    fingerprint_pattern_type VARCHAR(20) DEFAULT 'contains', -- 'contains', 'regex', 'exact', 'starts_with', 'ends_with'
    confidence_weight INTEGER DEFAULT 50, -- 1-100, weight for this fingerprint
    is_active BOOLEAN DEFAULT true,
    requires_auth BOOLEAN DEFAULT false,
    api_endpoint VARCHAR(500),
    documentation_url VARCHAR(500),
    deployment_methods JSONB DEFAULT '[]',
    capabilities JSONB DEFAULT '[]', -- Array of capability objects
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    
    -- Ensure unique combinations
    UNIQUE(provider_name, fingerprint_type, fingerprint_key, fingerprint_value)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_hosting_fingerprints_provider ON hosting_provider_fingerprints(provider_name);
CREATE INDEX idx_hosting_fingerprints_type ON hosting_provider_fingerprints(fingerprint_type);
CREATE INDEX idx_hosting_fingerprints_active ON hosting_provider_fingerprints(is_active);
CREATE INDEX idx_hosting_fingerprints_lookup ON hosting_provider_fingerprints(fingerprint_type, fingerprint_key, is_active);

-- ================================================
-- HOSTING PROVIDER DETECTIONS TABLE  
-- ================================================
-- Track detection results and confidence scores over time

CREATE TABLE IF NOT EXISTS hosting_provider_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    detected_providers JSONB DEFAULT '[]', -- Array of detected provider objects
    primary_provider VARCHAR(100),
    confidence_score INTEGER DEFAULT 0, -- 0-100
    detection_methods JSONB DEFAULT '[]', -- Methods used for detection
    fingerprints_matched JSONB DEFAULT '[]', -- Specific fingerprints that matched
    detection_duration_ms INTEGER,
    user_agent VARCHAR(255) DEFAULT 'SEOAgent-HostDetection/1.0',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Track detection history per domain
    UNIQUE(user_token, site_url, detected_at)
);

-- Create indexes for detection lookups
CREATE INDEX idx_provider_detections_user ON hosting_provider_detections(user_token);
CREATE INDEX idx_provider_detections_domain ON hosting_provider_detections(domain);
CREATE INDEX idx_provider_detections_primary ON hosting_provider_detections(primary_provider);
CREATE INDEX idx_provider_detections_detected_at ON hosting_provider_detections(detected_at);

-- ================================================
-- HOSTING INTEGRATIONS TABLE
-- ================================================
-- Track active hosting provider integrations per user

CREATE TABLE IF NOT EXISTS hosting_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    integration_type VARCHAR(50) NOT NULL, -- 'api', 'manual', 'oauth'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'error', 'disabled'
    api_credentials JSONB DEFAULT '{}', -- Encrypted API keys/tokens
    configuration JSONB DEFAULT '{}', -- Provider-specific config
    capabilities_enabled JSONB DEFAULT '[]', -- Which capabilities are enabled
    last_deployment_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    deployment_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error_message TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One integration per provider per site
    UNIQUE(user_token, site_url, provider_name)
);

-- Create indexes for integration management
CREATE INDEX idx_hosting_integrations_user ON hosting_integrations(user_token);
CREATE INDEX idx_hosting_integrations_site ON hosting_integrations(site_url);
CREATE INDEX idx_hosting_integrations_provider ON hosting_integrations(provider_name);
CREATE INDEX idx_hosting_integrations_status ON hosting_integrations(status);
CREATE INDEX idx_hosting_integrations_active ON hosting_integrations(user_token, status) WHERE status = 'active';

-- ================================================
-- INSERT INITIAL PROVIDER FINGERPRINTS
-- ================================================

-- Cloudflare Fingerprints
INSERT INTO hosting_provider_fingerprints (provider_name, provider_type, fingerprint_type, fingerprint_key, fingerprint_value, fingerprint_pattern_type, confidence_weight, requires_auth, capabilities, deployment_methods, api_endpoint, documentation_url) VALUES
('cloudflare', 'cdn', 'header', 'cf-ray', '^[a-f0-9]+-[A-Z]{3}$', 'regex', 90, true, 
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true},{"type":"robots_redirect","automated":true,"requiresAuth":true},{"type":"edge_function","automated":true,"requiresAuth":true}]',
 '["Page Rules","Workers","Transform Rules"]',
 'https://api.cloudflare.com/client/v4/zones/{zone_id}/pagerules',
 'https://developers.cloudflare.com/rules/'),

('cloudflare', 'cdn', 'header', 'server', 'cloudflare', 'contains', 80, true, 
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true},{"type":"robots_redirect","automated":true,"requiresAuth":true}]',
 '["Page Rules","Workers"]',
 'https://api.cloudflare.com/client/v4/zones/{zone_id}/pagerules',
 'https://developers.cloudflare.com/rules/'),

('cloudflare', 'cdn', 'header', 'cf-cache-status', '.+', 'regex', 70, true, 
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["Workers","Transform Rules"]',
 'https://api.cloudflare.com/client/v4/zones/{zone_id}/pagerules',
 'https://developers.cloudflare.com/rules/'),

-- Vercel Fingerprints  
('vercel', 'hosting', 'header', 'x-vercel-id', '.+', 'regex', 95, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true},{"type":"robots_redirect","automated":true,"requiresAuth":true},{"type":"serverless_function","automated":true,"requiresAuth":true}]',
 '["vercel.json redirects","Next.js rewrites","Edge Functions"]',
 'https://api.vercel.com/v1/projects/{project_id}/env',
 'https://vercel.com/docs/projects/project-configuration#redirects'),

('vercel', 'hosting', 'header', 'x-vercel-cache', '.+', 'regex', 80, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["vercel.json redirects","Next.js rewrites"]',
 'https://api.vercel.com/v1/projects/{project_id}/env',
 'https://vercel.com/docs/projects/project-configuration#redirects'),

('vercel', 'hosting', 'header', 'server', 'vercel', 'contains', 70, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["vercel.json redirects"]',
 'https://api.vercel.com/v1/projects/{project_id}/env',
 'https://vercel.com/docs/projects/project-configuration#redirects'),

-- Netlify Fingerprints
('netlify', 'hosting', 'header', 'x-nf-request-id', '.+', 'regex', 95, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true},{"type":"robots_redirect","automated":true,"requiresAuth":true},{"type":"edge_function","automated":true,"requiresAuth":true}]',
 '["_redirects file","netlify.toml","Edge Functions"]',
 'https://api.netlify.com/api/v1/sites/{site_id}/files',
 'https://docs.netlify.com/routing/redirects/'),

('netlify', 'hosting', 'header', 'server', 'netlify', 'contains', 80, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["_redirects file","netlify.toml"]',
 'https://api.netlify.com/api/v1/sites/{site_id}/files',
 'https://docs.netlify.com/routing/redirects/'),

('netlify', 'hosting', 'header', 'x-powered-by', 'netlify', 'contains', 70, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["_redirects file"]',
 'https://api.netlify.com/api/v1/sites/{site_id}/files',
 'https://docs.netlify.com/routing/redirects/'),

-- AWS CloudFront Fingerprints
('aws_cloudfront', 'cdn', 'header', 'x-amz-cf-id', '.+', 'regex', 90, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true},{"type":"robots_redirect","automated":true,"requiresAuth":true}]',
 '["CloudFront Behaviors","Lambda@Edge","CloudFront Functions"]',
 'https://cloudfront.amazonaws.com/',
 'https://docs.aws.amazon.com/cloudfront/'),

('aws_cloudfront', 'cdn', 'header', 'x-amz-cf-pop', '.+', 'regex', 80, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["CloudFront Behaviors","Lambda@Edge"]',
 'https://cloudfront.amazonaws.com/',
 'https://docs.aws.amazon.com/cloudfront/'),

('aws_cloudfront', 'cdn', 'header', 'server', 'CloudFront', 'contains', 70, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["CloudFront Behaviors"]',
 'https://cloudfront.amazonaws.com/',
 'https://docs.aws.amazon.com/cloudfront/'),

-- GitHub Pages Fingerprints
('github_pages', 'hosting', 'header', 'server', 'GitHub.com', 'contains', 85, false,
 '[{"type":"sitemap_proxy","automated":false,"requiresAuth":false}]',
 '["Static files in repository"]',
 null,
 'https://pages.github.com/'),

('github_pages', 'hosting', 'header', 'x-github-request-id', '.+', 'regex', 90, false,
 '[{"type":"sitemap_proxy","automated":false,"requiresAuth":false}]',
 '["Static files in repository"]',
 null,
 'https://pages.github.com/'),

-- Shopify Fingerprints
('shopify', 'cms', 'header', 'x-shopid', '.+', 'regex', 90, true,
 '[{"type":"sitemap_proxy","automated":true,"requiresAuth":true},{"type":"robots_proxy","automated":true,"requiresAuth":true}]',
 '["Theme files","Shopify Plus Scripts"]',
 'https://shopify.dev/api/admin-rest',
 'https://shopify.dev/api/admin-rest'),

('shopify', 'cms', 'header', 'x-shardid', '.+', 'regex', 80, true,
 '[{"type":"sitemap_proxy","automated":true,"requiresAuth":true}]',
 '["Theme files"]',
 'https://shopify.dev/api/admin-rest',
 'https://shopify.dev/api/admin-rest'),

('shopify', 'cms', 'header', 'x-shopify-stage', '.+', 'regex', 70, true,
 '[{"type":"sitemap_proxy","automated":true,"requiresAuth":true}]',
 '["Theme files"]',
 'https://shopify.dev/api/admin-rest',
 'https://shopify.dev/api/admin-rest'),

-- WordPress.com Fingerprints  
('wordpress_com', 'cms', 'header', 'x-hacker', 'WordPress.com', 'contains', 85, true,
 '[{"type":"sitemap_proxy","automated":true,"requiresAuth":true}]',
 '["WordPress.com API"]',
 'https://developer.wordpress.com/docs/api/',
 'https://developer.wordpress.com/docs/api/'),

('wordpress_com', 'cms', 'header', 'x-ac', '.+', 'regex', 70, true,
 '[{"type":"sitemap_proxy","automated":true,"requiresAuth":true}]',
 '["WordPress.com API"]',
 'https://developer.wordpress.com/docs/api/',
 'https://developer.wordpress.com/docs/api/'),

-- Fastly Fingerprints
('fastly', 'cdn', 'header', 'fastly-debug-digest', '.+', 'regex', 90, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["VCL Configuration"]',
 'https://api.fastly.com/',
 'https://developer.fastly.com/reference/api/'),

('fastly', 'cdn', 'header', 'x-served-by', 'fastly', 'contains', 80, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["VCL Configuration"]',
 'https://api.fastly.com/',
 'https://developer.fastly.com/reference/api/'),

('fastly', 'cdn', 'header', 'x-cache', 'fastly', 'contains', 70, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["VCL Configuration"]',
 'https://api.fastly.com/',
 'https://developer.fastly.com/reference/api/'),

-- KeyCDN Fingerprints
('keycdn', 'cdn', 'header', 'server', 'keycdn-engine', 'contains', 90, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["Zone Configuration"]',
 'https://www.keycdn.com/api',
 'https://www.keycdn.com/api'),

('keycdn', 'cdn', 'header', 'x-cache', 'keycdn', 'contains', 80, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["Zone Configuration"]',
 'https://www.keycdn.com/api',
 'https://www.keycdn.com/api'),

-- MaxCDN/StackPath Fingerprints
('maxcdn', 'cdn', 'header', 'server', 'NetDNA-cache', 'contains', 90, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["EdgeRules Configuration"]',
 'https://www.stackpath.com/products/api/',
 'https://stackpath.dev/'),

('maxcdn', 'cdn', 'header', 'x-cache', 'maxcdn', 'contains', 80, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["EdgeRules Configuration"]',
 'https://www.stackpath.com/products/api/',
 'https://stackpath.dev/');

-- ================================================
-- DNS-BASED FINGERPRINTS
-- ================================================
-- Note: DNS fingerprints require server-side resolution in production

INSERT INTO hosting_provider_fingerprints (provider_name, provider_type, fingerprint_type, fingerprint_key, fingerprint_value, fingerprint_pattern_type, confidence_weight, requires_auth, capabilities, deployment_methods, metadata) VALUES
-- Cloudflare DNS
('cloudflare', 'cdn', 'dns', 'cname', 'cloudflare.net', 'ends_with', 85, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["Page Rules","Workers"]',
 '{"dns_type":"cname","record_pattern":"cloudflare.net"}'),

('cloudflare', 'cdn', 'dns', 'cname', 'cloudflarenet.com', 'ends_with', 80, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["Page Rules","Workers"]',
 '{"dns_type":"cname","record_pattern":"cloudflarenet.com"}'),

-- Vercel DNS
('vercel', 'hosting', 'dns', 'cname', 'vercel.app', 'ends_with', 90, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["vercel.json redirects"]',
 '{"dns_type":"cname","record_pattern":"vercel.app"}'),

('vercel', 'hosting', 'dns', 'cname', 'vercel.com', 'ends_with', 85, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["vercel.json redirects"]',
 '{"dns_type":"cname","record_pattern":"vercel.com"}'),

-- Netlify DNS
('netlify', 'hosting', 'dns', 'cname', 'netlify.com', 'ends_with', 90, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["_redirects file"]',
 '{"dns_type":"cname","record_pattern":"netlify.com"}'),

('netlify', 'hosting', 'dns', 'cname', 'netlify.app', 'ends_with', 85, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["_redirects file"]',
 '{"dns_type":"cname","record_pattern":"netlify.app"}'),

-- AWS CloudFront DNS
('aws_cloudfront', 'cdn', 'dns', 'cname', 'cloudfront.net', 'ends_with', 90, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["CloudFront Behaviors"]',
 '{"dns_type":"cname","record_pattern":"cloudfront.net"}'),

('aws_cloudfront', 'cdn', 'dns', 'cname', 'amazonaws.com', 'ends_with', 70, true,
 '[{"type":"sitemap_redirect","automated":true,"requiresAuth":true}]',
 '["CloudFront Behaviors"]',
 '{"dns_type":"cname","record_pattern":"amazonaws.com"}'),

-- GitHub Pages DNS
('github_pages', 'hosting', 'dns', 'cname', 'github.io', 'ends_with', 95, false,
 '[{"type":"sitemap_proxy","automated":false,"requiresAuth":false}]',
 '["Static files in repository"]',
 '{"dns_type":"cname","record_pattern":"github.io"}'),

('github_pages', 'hosting', 'dns', 'cname', 'github.com', 'ends_with', 80, false,
 '[{"type":"sitemap_proxy","automated":false,"requiresAuth":false}]',
 '["Static files in repository"]',
 '{"dns_type":"cname","record_pattern":"github.com"}'),

-- Shopify DNS
('shopify', 'cms', 'dns', 'cname', 'shops.myshopify.com', 'ends_with', 95, true,
 '[{"type":"sitemap_proxy","automated":true,"requiresAuth":true}]',
 '["Theme files"]',
 '{"dns_type":"cname","record_pattern":"shops.myshopify.com"}'),

-- WordPress.com DNS  
('wordpress_com', 'cms', 'dns', 'cname', 'wordpress.com', 'ends_with', 90, true,
 '[{"type":"sitemap_proxy","automated":true,"requiresAuth":true}]',
 '["WordPress.com API"]',
 '{"dns_type":"cname","record_pattern":"wordpress.com"}');

-- ================================================
-- PATH-BASED FINGERPRINTS  
-- ================================================
-- Detect providers by testing common paths

INSERT INTO hosting_provider_fingerprints (provider_name, provider_type, fingerprint_type, fingerprint_key, fingerprint_value, fingerprint_pattern_type, confidence_weight, requires_auth, capabilities, deployment_methods, metadata) VALUES
-- Shopify Path Fingerprints
('shopify', 'cms', 'path', '/admin', '200,404,403', 'status_codes', 60, true,
 '[{"type":"sitemap_proxy","automated":true,"requiresAuth":true}]',
 '["Theme files"]',
 '{"path_test":"/admin","expected_status_codes":[200,404,403],"indicates_shopify":true}'),

('shopify', 'cms', 'path', '/cart.js', '200', 'status_codes', 70, true,
 '[{"type":"sitemap_proxy","automated":true,"requiresAuth":true}]',
 '["Theme files"]',
 '{"path_test":"/cart.js","expected_status_codes":[200],"indicates_shopify":true}'),

('shopify', 'cms', 'path', '/products.json', '200', 'status_codes', 80, true,
 '[{"type":"sitemap_proxy","automated":true,"requiresAuth":true}]',
 '["Theme files"]',
 '{"path_test":"/products.json","expected_status_codes":[200],"indicates_shopify":true}'),

-- WordPress Path Fingerprints
('wordpress', 'cms', 'path', '/wp-admin', '200,404,403,302', 'status_codes', 70, false,
 '[{"type":"sitemap_proxy","automated":false,"requiresAuth":false}]',
 '["Manual file upload","Plugin integration"]',
 '{"path_test":"/wp-admin","expected_status_codes":[200,404,403,302],"indicates_wordpress":true}'),

('wordpress', 'cms', 'path', '/wp-content', '200,404,403', 'status_codes', 60, false,
 '[{"type":"sitemap_proxy","automated":false,"requiresAuth":false}]',
 '["Manual file upload","Plugin integration"]',
 '{"path_test":"/wp-content","expected_status_codes":[200,404,403],"indicates_wordpress":true}'),

('wordpress', 'cms', 'path', '/wp-json', '200,404', 'status_codes', 75, false,
 '[{"type":"sitemap_proxy","automated":true,"requiresAuth":true}]',
 '["REST API integration","Plugin integration"]',
 '{"path_test":"/wp-json","expected_status_codes":[200,404],"indicates_wordpress_api":true}');

-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================

-- Enable RLS on hosting tables
ALTER TABLE hosting_provider_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosting_provider_detections ENABLE ROW LEVEL SECURITY;  
ALTER TABLE hosting_integrations ENABLE ROW LEVEL SECURITY;

-- Fingerprints table: Read access for all authenticated users, write access for admins only
CREATE POLICY "Allow read access to fingerprints" ON hosting_provider_fingerprints
    FOR SELECT USING (true);

CREATE POLICY "Allow admin write access to fingerprints" ON hosting_provider_fingerprints
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_user_id FROM login_users 
            WHERE email IN ('alec@seometrics.com', 'admin@seoagent.com')
        )
    );

-- Detections table: Users can only see their own detections
CREATE POLICY "Users can view own detections" ON hosting_provider_detections
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own detections" ON hosting_provider_detections
    FOR INSERT WITH CHECK (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- Integrations table: Users can only manage their own integrations
CREATE POLICY "Users can view own integrations" ON hosting_integrations
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own integrations" ON hosting_integrations
    FOR ALL USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- ================================================
-- FUNCTIONS AND TRIGGERS
-- ================================================

-- Update trigger for hosting_provider_fingerprints
CREATE OR REPLACE FUNCTION update_hosting_fingerprints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hosting_fingerprints_updated_at
    BEFORE UPDATE ON hosting_provider_fingerprints
    FOR EACH ROW
    EXECUTE FUNCTION update_hosting_fingerprints_updated_at();

-- Update trigger for hosting_integrations
CREATE TRIGGER trigger_hosting_integrations_updated_at
    BEFORE UPDATE ON hosting_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================

COMMENT ON TABLE hosting_provider_fingerprints IS 'Dynamic fingerprints for hosting provider detection';
COMMENT ON TABLE hosting_provider_detections IS 'Historical hosting provider detection results';
COMMENT ON TABLE hosting_integrations IS 'Active hosting provider integrations per user';

COMMENT ON COLUMN hosting_provider_fingerprints.fingerprint_type IS 'Detection method: header, dns, ssl, path, ip_range';
COMMENT ON COLUMN hosting_provider_fingerprints.fingerprint_pattern_type IS 'Pattern matching: contains, regex, exact, starts_with, ends_with';
COMMENT ON COLUMN hosting_provider_fingerprints.confidence_weight IS 'Weight for this fingerprint in overall confidence calculation (1-100)';
COMMENT ON COLUMN hosting_provider_fingerprints.capabilities IS 'JSON array of provider capabilities';
COMMENT ON COLUMN hosting_provider_fingerprints.deployment_methods IS 'JSON array of available deployment methods';

COMMENT ON COLUMN hosting_provider_detections.detected_providers IS 'JSON array of all detected providers with confidence scores';
COMMENT ON COLUMN hosting_provider_detections.fingerprints_matched IS 'JSON array of fingerprints that matched during detection';

COMMENT ON COLUMN hosting_integrations.api_credentials IS 'Encrypted API credentials (use encryption at application level)';
COMMENT ON COLUMN hosting_integrations.capabilities_enabled IS 'JSON array of enabled capabilities for this integration';