-- Create system logs table for tracking automated processes
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    log_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_logs_type_created ON system_logs(log_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC);

-- Enable RLS (though this table is system-only)
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for system access only (no user access needed)
CREATE POLICY "System logs are system accessible only" ON system_logs
    FOR ALL USING (false); -- No user access, only service role