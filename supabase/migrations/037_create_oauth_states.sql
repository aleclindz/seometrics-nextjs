-- Create oauth_states table for secure OAuth flow management
-- This table temporarily stores OAuth state parameters to prevent CSRF attacks

CREATE TABLE oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state TEXT NOT NULL UNIQUE,
    user_token TEXT NOT NULL,
    provider TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (provider IN ('vercel', 'netlify', 'cloudflare', 'github')),
    CHECK (expires_at > created_at)
);

-- Indexes for efficient querying
CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_user_provider ON oauth_states(user_token, provider);
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Row Level Security (RLS)
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own OAuth states" ON oauth_states
    FOR ALL USING (auth.uid()::text = user_token);

-- Allow service role full access for API operations
CREATE POLICY "Service role full access to OAuth states" ON oauth_states
    FOR ALL TO service_role USING (true);

-- Comments for documentation
COMMENT ON TABLE oauth_states IS 'Temporary storage for OAuth state parameters to prevent CSRF attacks';
COMMENT ON COLUMN oauth_states.state IS 'Unique state parameter sent to OAuth provider';
COMMENT ON COLUMN oauth_states.user_token IS 'User identifier from auth system';
COMMENT ON COLUMN oauth_states.provider IS 'OAuth provider name (vercel, netlify, etc.)';
COMMENT ON COLUMN oauth_states.expires_at IS 'When this OAuth state expires (typically 10 minutes)';

-- Cleanup function to remove expired states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
    DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run every hour (requires pg_cron extension)
-- Note: This would typically be handled by application logic or cron jobs
-- SELECT cron.schedule('cleanup-oauth-states', '0 * * * *', 'SELECT cleanup_expired_oauth_states();');