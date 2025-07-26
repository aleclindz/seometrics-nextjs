-- Google Search Console integration tables
-- Stores OAuth tokens and search console data

-- GSC connections table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS gsc_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- OAuth tokens
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- GSC account info
    email VARCHAR(255) NOT NULL,
    scope TEXT NOT NULL DEFAULT 'https://www.googleapis.com/auth/webmasters.readonly',
    
    -- Connection status
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_errors JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique per user
    UNIQUE(user_token)
);

-- GSC properties table for verified properties
CREATE TABLE IF NOT EXISTS gsc_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES gsc_connections(id) ON DELETE CASCADE,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Property details
    site_url TEXT NOT NULL,
    permission_level VARCHAR(50) NOT NULL,
    
    -- Property status
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Last sync data
    last_sync_at TIMESTAMP WITH TIME ZONE,
    performance_data JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(connection_id, site_url)
);

-- GSC performance data table for historical data
CREATE TABLE IF NOT EXISTS gsc_performance_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES gsc_properties(id) ON DELETE CASCADE,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Date range
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    
    -- Aggregated metrics
    total_clicks INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    avg_ctr DECIMAL(10,6) DEFAULT 0,
    avg_position DECIMAL(10,4) DEFAULT 0,
    
    -- Detailed data (JSON arrays)
    queries JSONB DEFAULT '[]',
    pages JSONB DEFAULT '[]',
    countries JSONB DEFAULT '[]',
    devices JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for date ranges
    UNIQUE(property_id, date_start, date_end)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gsc_connections_user_token ON gsc_connections(user_token);
CREATE INDEX IF NOT EXISTS idx_gsc_connections_active ON gsc_connections(user_token, is_active);
CREATE INDEX IF NOT EXISTS idx_gsc_properties_connection_id ON gsc_properties(connection_id);
CREATE INDEX IF NOT EXISTS idx_gsc_properties_user_token ON gsc_properties(user_token);
CREATE INDEX IF NOT EXISTS idx_gsc_properties_active ON gsc_properties(user_token, is_active);
CREATE INDEX IF NOT EXISTS idx_gsc_performance_property_id ON gsc_performance_data(property_id);
CREATE INDEX IF NOT EXISTS idx_gsc_performance_dates ON gsc_performance_data(property_id, date_start, date_end);

-- Updated_at triggers
CREATE TRIGGER update_gsc_connections_updated_at 
    BEFORE UPDATE ON gsc_connections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gsc_properties_updated_at 
    BEFORE UPDATE ON gsc_properties 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();