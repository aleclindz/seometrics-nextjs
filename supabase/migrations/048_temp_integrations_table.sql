-- Create temporary integrations table for marketplace OAuth flow
-- Users who come from Vercel marketplace need to store their OAuth data
-- before they sign up for an account

CREATE TABLE temp_integrations (
    id SERIAL PRIMARY KEY,
    temp_id VARCHAR(255) UNIQUE NOT NULL,
    integration_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    user_token VARCHAR(255) REFERENCES login_users(token)
);

-- Index for cleanup queries
CREATE INDEX idx_temp_integrations_expires_at ON temp_integrations(expires_at);
CREATE INDEX idx_temp_integrations_temp_id ON temp_integrations(temp_id);

-- Function to cleanup expired temporary integrations
CREATE OR REPLACE FUNCTION cleanup_expired_temp_integrations()
RETURNS void AS $$
BEGIN
    DELETE FROM temp_integrations 
    WHERE expires_at < NOW() 
    AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily (Note: this would need to be set up in production)
-- SELECT cron.schedule('cleanup-temp-integrations', '0 2 * * *', 'SELECT cleanup_expired_temp_integrations();');