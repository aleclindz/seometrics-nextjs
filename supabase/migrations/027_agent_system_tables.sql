-- Migration: Agent System Tables
-- Description: Create tables for agent events, actions, and ideas tracking
-- Date: 2024-01-26

-- Enable RLS
SET row_security = on;

-- Agent Events Table (activity tracking)
CREATE TABLE IF NOT EXISTS agent_events (
  id SERIAL PRIMARY KEY,
  user_token VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}',
  old_state JSONB,
  new_state JSONB,
  related_id VARCHAR(255), -- ID of related action/idea/etc
  site_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Actions Table (tasks/workflows)
CREATE TABLE IF NOT EXISTS agent_actions (
  id SERIAL PRIMARY KEY,
  user_token VARCHAR(255) NOT NULL,
  site_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  action_type VARCHAR(50) DEFAULT 'general',
  status VARCHAR(20) DEFAULT 'pending',
  priority_score INTEGER DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  data JSONB DEFAULT '{}', -- Action-specific data
  result JSONB, -- Action execution result
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Ideas Table (recommendations)
CREATE TABLE IF NOT EXISTS agent_ideas (
  id SERIAL PRIMARY KEY,
  user_token VARCHAR(255) NOT NULL,
  site_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  evidence TEXT,
  hypothesis TEXT,
  ice_score INTEGER DEFAULT 0, -- Impact, Confidence, Ease score
  status VARCHAR(20) DEFAULT 'open',
  category VARCHAR(50) DEFAULT 'general',
  data JSONB DEFAULT '{}', -- Idea-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_events_user_token ON agent_events(user_token);
CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON agent_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_site_url ON agent_events(site_url);

CREATE INDEX IF NOT EXISTS idx_agent_actions_user_token ON agent_actions(user_token);
CREATE INDEX IF NOT EXISTS idx_agent_actions_status ON agent_actions(status);
CREATE INDEX IF NOT EXISTS idx_agent_actions_site_url ON agent_actions(site_url);
CREATE INDEX IF NOT EXISTS idx_agent_actions_scheduled ON agent_actions(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_agent_ideas_user_token ON agent_ideas(user_token);
CREATE INDEX IF NOT EXISTS idx_agent_ideas_status ON agent_ideas(status);
CREATE INDEX IF NOT EXISTS idx_agent_ideas_site_url ON agent_ideas(site_url);
CREATE INDEX IF NOT EXISTS idx_agent_ideas_ice_score ON agent_ideas(ice_score DESC);

-- Row Level Security (RLS) Policies

-- Agent Events RLS
ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agent events" ON agent_events
  FOR SELECT USING (user_token = current_setting('request.jwt.claims')::json->>'token');

CREATE POLICY "Users can insert their own agent events" ON agent_events
  FOR INSERT WITH CHECK (user_token = current_setting('request.jwt.claims')::json->>'token');

-- Agent Actions RLS  
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agent actions" ON agent_actions
  FOR ALL USING (user_token = current_setting('request.jwt.claims')::json->>'token');

-- Agent Ideas RLS
ALTER TABLE agent_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agent ideas" ON agent_ideas
  FOR ALL USING (user_token = current_setting('request.jwt.claims')::json->>'token');

-- Add comments for documentation
COMMENT ON TABLE agent_events IS 'Tracks all agent system events and state changes';
COMMENT ON TABLE agent_actions IS 'Stores agent tasks, workflows, and automation actions';
COMMENT ON TABLE agent_ideas IS 'Contains agent-generated ideas and recommendations';

COMMENT ON COLUMN agent_actions.ice_score IS 'Impact, Confidence, Ease score (0-100)';
COMMENT ON COLUMN agent_actions.status IS 'pending, queued, running, completed, failed, cancelled';
COMMENT ON COLUMN agent_ideas.status IS 'open, adopted, implemented, rejected, archived';

-- Insert initial system event to test the tables
INSERT INTO agent_events (user_token, event_type, event_data, site_url) 
VALUES ('system', 'agent_tables_created', '{"migration": "027_agent_system_tables", "timestamp": "' || NOW() || '"}', null)
ON CONFLICT DO NOTHING;