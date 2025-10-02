-- Deployment automation system tables
-- Tracks failed deployments and queues automatic fixes

-- Table to log deployment failures
CREATE TABLE IF NOT EXISTS deployment_failures (
  id SERIAL PRIMARY KEY,
  deployment_id TEXT NOT NULL,
  deployment_url TEXT NOT NULL,
  project_name TEXT NOT NULL,
  errors TEXT[] DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending_fix',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- Table to queue automatic fixes
CREATE TABLE IF NOT EXISTS auto_fix_queue (
  id SERIAL PRIMARY KEY,
  deployment_id TEXT NOT NULL,
  errors TEXT[] DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}',
  commit_message TEXT,
  status VARCHAR(50) DEFAULT 'queued', -- queued, processing, completed, failed, resolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  fix_applied_at TIMESTAMP WITH TIME ZONE,
  fix_commit_sha TEXT,
  fix_notes TEXT,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_deployment_failures_status ON deployment_failures(status);
CREATE INDEX IF NOT EXISTS idx_deployment_failures_created_at ON deployment_failures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_fix_queue_status ON auto_fix_queue(status);
CREATE INDEX IF NOT EXISTS idx_auto_fix_queue_created_at ON auto_fix_queue(created_at DESC);

-- Add RLS policies (allow service role access)
ALTER TABLE deployment_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_fix_queue ENABLE ROW LEVEL SECURITY;

-- Service role can do anything
CREATE POLICY "Service role full access to deployment_failures"
  ON deployment_failures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to auto_fix_queue"
  ON auto_fix_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a function to get pending fixes
CREATE OR REPLACE FUNCTION get_pending_fixes()
RETURNS TABLE (
  id INTEGER,
  deployment_id TEXT,
  errors TEXT[],
  suggestions TEXT[],
  commit_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    afq.id,
    afq.deployment_id,
    afq.errors,
    afq.suggestions,
    afq.commit_message,
    afq.created_at,
    afq.retry_count
  FROM auto_fix_queue afq
  WHERE afq.status = 'queued'
    AND afq.retry_count < 3
  ORDER BY afq.created_at ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment the tables
COMMENT ON TABLE deployment_failures IS 'Logs Vercel deployment failures with error analysis';
COMMENT ON TABLE auto_fix_queue IS 'Queue for automatic deployment fix attempts';
COMMENT ON COLUMN auto_fix_queue.retry_count IS 'Number of fix attempts (max 3)';
