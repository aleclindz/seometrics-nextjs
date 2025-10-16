-- Agent Memory System for Website-specific Context
-- This enables each website to have its own persistent agent memory

-- Agent memory table - stores contextual knowledge per website
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_token TEXT NOT NULL,
  user_token TEXT NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('context', 'patterns', 'preferences', 'insights', 'strategies')),
  memory_key TEXT NOT NULL, -- e.g., 'seo_focus', 'content_style', 'successful_keywords'
  memory_data JSONB NOT NULL,
  confidence_score FLOAT DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- optional expiration for temporary insights
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Agent learning table - tracks action success/failure patterns
CREATE TABLE IF NOT EXISTS agent_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_token TEXT NOT NULL,
  user_token TEXT NOT NULL,
  action_type TEXT NOT NULL, -- function name (e.g., 'generate_article', 'audit_site')
  action_context JSONB NOT NULL, -- parameters and conditions when action was taken
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'partial')),
  success_metrics JSONB, -- quantifiable results (e.g., {'seo_score': 85, 'user_satisfaction': 'positive'})
  error_details TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_agent_memory_website_token ON agent_memory(website_token);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_token ON agent_memory(user_token);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_key ON agent_memory(memory_key);
CREATE INDEX IF NOT EXISTS idx_agent_memory_updated ON agent_memory(last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_agent_learning_website_token ON agent_learning(website_token);
CREATE INDEX IF NOT EXISTS idx_agent_learning_action_type ON agent_learning(action_type);
CREATE INDEX IF NOT EXISTS idx_agent_learning_outcome ON agent_learning(outcome);
CREATE INDEX IF NOT EXISTS idx_agent_learning_created ON agent_learning(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_memory_website_type ON agent_memory(website_token, memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_learning_website_action ON agent_learning(website_token, action_type);

-- Row Level Security (RLS) policies
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning ENABLE ROW LEVEL SECURITY;

-- Policies for agent_memory
CREATE POLICY "Users can view their own agent memory" ON agent_memory
  FOR SELECT USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can insert their own agent memory" ON agent_memory
  FOR INSERT WITH CHECK (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can update their own agent memory" ON agent_memory
  FOR UPDATE USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can delete their own agent memory" ON agent_memory
  FOR DELETE USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

-- Policies for agent_learning
CREATE POLICY "Users can view their own agent learning" ON agent_learning
  FOR SELECT USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can insert their own agent learning" ON agent_learning
  FOR INSERT WITH CHECK (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can update their own agent learning" ON agent_learning
  FOR UPDATE USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

CREATE POLICY "Users can delete their own agent learning" ON agent_learning
  FOR DELETE USING (user_token = current_setting('request.jwt.claims', true)::json->>'user_token');

-- Function to clean up expired memories
CREATE OR REPLACE FUNCTION cleanup_expired_agent_memory()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM agent_memory 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert some initial seed data for common memory patterns
INSERT INTO agent_memory (website_token, user_token, memory_type, memory_key, memory_data, confidence_score) VALUES
  ('example', 'example-user', 'context', 'initialization', '{"status": "initialized", "version": "1.0"}', 1.0)
ON CONFLICT DO NOTHING;