-- Add host connections table for deployment integrations (Vercel, Netlify, etc.)
CREATE TABLE IF NOT EXISTS host_connections (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    host_type VARCHAR(50) NOT NULL DEFAULT 'vercel', -- 'vercel', 'netlify', 'github_pages', 'custom'
    connection_name VARCHAR(255) NOT NULL,
    api_token TEXT, -- encrypted
    team_id VARCHAR(255), -- for Vercel teams
    project_id VARCHAR(255),
    project_name VARCHAR(255),
    domain VARCHAR(255),
    deployment_status VARCHAR(50) DEFAULT 'inactive', -- 'active', 'inactive', 'error'
    last_deployment_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    webhook_url TEXT,
    webhook_secret VARCHAR(255),
    auto_deploy_enabled BOOLEAN DEFAULT false,
    build_command VARCHAR(500),
    output_directory VARCHAR(255) DEFAULT 'dist',
    node_version VARCHAR(20) DEFAULT '18.x',
    environment_variables JSONB DEFAULT '{}',
    config_data JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token, website_id, connection_name)
);

-- Add RLS policies
ALTER TABLE host_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own host connections
CREATE POLICY "Users can access their own host connections" ON host_connections
    FOR ALL USING (user_token = (
        SELECT token FROM login_users 
        WHERE auth_user_id = auth.uid()
    ));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_host_connections_user_token ON host_connections(user_token);
CREATE INDEX IF NOT EXISTS idx_host_connections_website_id ON host_connections(website_id);
CREATE INDEX IF NOT EXISTS idx_host_connections_host_type ON host_connections(host_type);
CREATE INDEX IF NOT EXISTS idx_host_connections_status ON host_connections(deployment_status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_host_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_host_connections_updated_at
    BEFORE UPDATE ON host_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_host_connections_updated_at();

-- Add host_status to websites table if it doesn't exist
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS host_status VARCHAR(50) DEFAULT 'none';

-- Comment explaining the schema
COMMENT ON TABLE host_connections IS 'Store deployment host integrations (Vercel, Netlify, etc.)';
COMMENT ON COLUMN host_connections.host_type IS 'Type of hosting platform: vercel, netlify, github_pages, custom';
COMMENT ON COLUMN host_connections.deployment_status IS 'Current deployment status: active, inactive, error';
COMMENT ON COLUMN host_connections.auto_deploy_enabled IS 'Whether automatic deployments are enabled';
COMMENT ON COLUMN host_connections.config_data IS 'Host-specific configuration and settings';