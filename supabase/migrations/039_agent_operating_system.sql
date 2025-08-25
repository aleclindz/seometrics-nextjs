-- Agent Operating System Database Schema
-- This migration implements the core state machines for the agent framework

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for agent state management
CREATE TYPE agent_idea_status AS ENUM (
  'open',           -- default; not yet adopted
  'adopted',        -- plan created (links to actions)
  'in_progress',    -- at least one derived action running
  'paused',         -- blocked (failed action / missing approval)
  'done',           -- all derived actions completed
  'rejected'        -- intentionally closed
);

CREATE TYPE agent_action_status AS ENUM (
  'proposed',           -- ready for approval/prioritization
  'queued',             -- accepted into the work queue
  'scheduled',          -- queued for a specific time/recurrence
  'running',            -- worker executing
  'needs_verification', -- change applied; awaiting checks
  'verified',           -- checks passed
  'completed',          -- recorded as finished
  'failed',             -- unrecoverable error (keeps evidence)
  'cancelled',          -- cancelled before execution
  'declined',           -- rejected during approval
  'reverted'            -- explicitly reverted after completion
);

CREATE TYPE agent_run_status AS ENUM (
  'queued',     -- created, not yet executing
  'running',    -- consuming budget
  'succeeded',  -- completed successfully
  'failed',     -- failed with error
  'cancelled'   -- stopped before completion
);

CREATE TYPE agent_patch_status AS ENUM (
  'suggested',  -- created by diff/proposer
  'approved',   -- cleared by policy/human
  'applied',    -- executed in target system
  'rejected',   -- denied approval
  'reverted'    -- rolled back after application
);

CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE environment_type AS ENUM ('DRY_RUN', 'STAGING', 'PRODUCTION');

-- 1. AGENT IDEAS TABLE
-- Purpose: Turn evidence into actionable plans (backlog → value)
CREATE TABLE agent_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  title TEXT NOT NULL,
  hypothesis TEXT,
  evidence JSONB DEFAULT '{}',
  ice_score INTEGER, -- Impact/Confidence/Ease scoring (1-100)
  status agent_idea_status DEFAULT 'open',
  
  -- Lifecycle tracking
  adopted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  priority INTEGER DEFAULT 50,
  estimated_effort VARCHAR(20), -- 'easy', 'medium', 'hard'
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AGENT ACTIONS TABLE  
-- Purpose: Concrete executable units (todo → done)
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES agent_ideas(id) ON DELETE CASCADE,
  user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  
  -- Action definition
  action_type VARCHAR(100) NOT NULL, -- 'content_generation', 'technical_fix', 'cms_publish', 'crawl', 'verify'
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB DEFAULT '{}', -- explicit targets, params
  policy JSONB DEFAULT '{}', -- blast-radius, approvals, timeouts, environment
  
  -- State management
  status agent_action_status DEFAULT 'proposed',
  priority_score INTEGER DEFAULT 50,
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE,
  recurring_pattern VARCHAR(100), -- cron pattern for recurring actions
  next_occurrence TIMESTAMP WITH TIME ZONE,
  
  -- Lifecycle tracking
  queued_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. AGENT RUNS TABLE
-- Purpose: Bounded execution envelopes for safe operation
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES agent_actions(id) ON DELETE CASCADE,
  user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
  
  -- Idempotency and safety
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  policy JSONB NOT NULL, -- max_pages, max_patches, environment, timeouts
  
  -- Execution tracking
  status agent_run_status DEFAULT 'queued',
  stats JSONB DEFAULT '{}', -- pages_touched, patches_applied, execution_time
  
  -- Budget consumption
  budget_consumed JSONB DEFAULT '{}', -- track resource usage
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Results
  output_data JSONB DEFAULT '{}',
  error_details TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AGENT PATCHES TABLE
-- Purpose: Atomic, explainable changes to pages/documents
CREATE TABLE agent_patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
  
  -- Target specification
  target_url TEXT NOT NULL,
  selector TEXT, -- CSS selector for precise targeting
  element_type VARCHAR(50), -- 'meta', 'img', 'schema', 'canonical'
  
  -- Change specification
  change_type VARCHAR(50) NOT NULL, -- 'upsert_meta', 'add_alt_text', 'inject_schema', 'set_canonical'
  before_value TEXT,
  after_value TEXT,
  
  -- Context and reasoning
  rationale TEXT NOT NULL,
  risk_level risk_level DEFAULT 'low',
  
  -- State management
  status agent_patch_status DEFAULT 'suggested',
  
  -- Application tracking
  applied_at TIMESTAMP WITH TIME ZONE,
  reverted_at TIMESTAMP WITH TIME ZONE,
  
  -- Verification
  verification_status VARCHAR(20), -- 'pending', 'verified', 'failed'
  verification_details JSONB DEFAULT '{}',
  
  -- Revert capability
  revert_patch_id UUID REFERENCES agent_patches(id),
  is_revert BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. AGENT CAPABILITIES TABLE
-- Purpose: Dynamic capability registry for integrations
CREATE TABLE agent_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_name VARCHAR(100) NOT NULL, -- e.g., 'STRAPI.create_entry', 'SEO.crawl'
  category VARCHAR(50) NOT NULL, -- 'cms', 'seo', 'analytics', 'verification'
  description TEXT,
  parameters_schema JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Site-specific availability
  available_for_sites TEXT[], -- empty array = available for all
  required_integrations TEXT[], -- list of required integration types
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(capability_name)
);

-- 6. AGENT_EVENTS TABLE
-- Purpose: Immutable event log for full auditability
CREATE TABLE agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
  
  -- Event identification
  event_type VARCHAR(50) NOT NULL, -- 'idea_created', 'action_started', 'patch_applied', 'status_changed'
  entity_type VARCHAR(20) NOT NULL, -- 'idea', 'action', 'run', 'patch'
  entity_id UUID NOT NULL,
  
  -- Event data
  event_data JSONB DEFAULT '{}',
  previous_state VARCHAR(50),
  new_state VARCHAR(50),
  
  -- Context
  triggered_by VARCHAR(50), -- 'user', 'system', 'schedule', 'webhook'
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_agent_ideas_user_token ON agent_ideas(user_token);
CREATE INDEX idx_agent_ideas_status ON agent_ideas(status);
CREATE INDEX idx_agent_ideas_site_url ON agent_ideas(site_url);
CREATE INDEX idx_agent_ideas_priority ON agent_ideas(priority DESC);

CREATE INDEX idx_agent_actions_user_token ON agent_actions(user_token);
CREATE INDEX idx_agent_actions_status ON agent_actions(status);
CREATE INDEX idx_agent_actions_idea_id ON agent_actions(idea_id);
CREATE INDEX idx_agent_actions_scheduled_for ON agent_actions(scheduled_for);
CREATE INDEX idx_agent_actions_priority ON agent_actions(priority_score DESC);
CREATE INDEX idx_agent_actions_type ON agent_actions(action_type);

CREATE INDEX idx_agent_runs_action_id ON agent_runs(action_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_idempotency_key ON agent_runs(idempotency_key);

CREATE INDEX idx_agent_patches_run_id ON agent_patches(run_id);
CREATE INDEX idx_agent_patches_target_url ON agent_patches(target_url);
CREATE INDEX idx_agent_patches_status ON agent_patches(status);
CREATE INDEX idx_agent_patches_risk_level ON agent_patches(risk_level);

CREATE INDEX idx_agent_events_user_token ON agent_events(user_token);
CREATE INDEX idx_agent_events_entity_type_id ON agent_events(entity_type, entity_id);
CREATE INDEX idx_agent_events_event_type ON agent_events(event_type);
CREATE INDEX idx_agent_events_created_at ON agent_events(created_at DESC);

-- Create Row Level Security (RLS) policies
ALTER TABLE agent_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user data isolation
CREATE POLICY agent_ideas_user_access ON agent_ideas 
  FOR ALL USING (user_token IN (
    SELECT token FROM login_users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY agent_actions_user_access ON agent_actions 
  FOR ALL USING (user_token IN (
    SELECT token FROM login_users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY agent_runs_user_access ON agent_runs 
  FOR ALL USING (user_token IN (
    SELECT token FROM login_users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY agent_patches_user_access ON agent_patches 
  FOR ALL USING (user_token IN (
    SELECT token FROM login_users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY agent_events_user_access ON agent_events 
  FOR ALL USING (user_token IN (
    SELECT token FROM login_users WHERE auth_user_id = auth.uid()
  ));

-- Capabilities are globally readable but only manageable by service role
CREATE POLICY agent_capabilities_read_access ON agent_capabilities 
  FOR SELECT USING (true);

-- Function to log events automatically
CREATE OR REPLACE FUNCTION log_agent_event(
  p_user_token VARCHAR(255),
  p_event_type VARCHAR(50),
  p_entity_type VARCHAR(20),
  p_entity_id UUID,
  p_event_data JSONB DEFAULT '{}',
  p_previous_state VARCHAR(50) DEFAULT NULL,
  p_new_state VARCHAR(50) DEFAULT NULL,
  p_triggered_by VARCHAR(50) DEFAULT 'system'
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO agent_events (
    user_token, event_type, entity_type, entity_id, 
    event_data, previous_state, new_state, triggered_by
  ) VALUES (
    p_user_token, p_event_type, p_entity_type, p_entity_id,
    p_event_data, p_previous_state, p_new_state, p_triggered_by
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger functions for automatic event logging
CREATE OR REPLACE FUNCTION trigger_log_agent_idea_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_agent_event(
      NEW.user_token, 'idea_created', 'idea', NEW.id,
      jsonb_build_object('title', NEW.title, 'status', NEW.status),
      NULL, NEW.status::VARCHAR, 'user'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM log_agent_event(
      NEW.user_token, 'idea_status_changed', 'idea', NEW.id,
      jsonb_build_object('title', NEW.title),
      OLD.status::VARCHAR, NEW.status::VARCHAR, 'system'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_log_agent_action_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_agent_event(
      NEW.user_token, 'action_created', 'action', NEW.id,
      jsonb_build_object('title', NEW.title, 'type', NEW.action_type, 'status', NEW.status),
      NULL, NEW.status::VARCHAR, 'system'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM log_agent_event(
      NEW.user_token, 'action_status_changed', 'action', NEW.id,
      jsonb_build_object('title', NEW.title, 'type', NEW.action_type),
      OLD.status::VARCHAR, NEW.status::VARCHAR, 'system'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER agent_idea_events_trigger
  AFTER INSERT OR UPDATE ON agent_ideas
  FOR EACH ROW EXECUTE FUNCTION trigger_log_agent_idea_events();

CREATE TRIGGER agent_action_events_trigger
  AFTER INSERT OR UPDATE ON agent_actions
  FOR EACH ROW EXECUTE FUNCTION trigger_log_agent_action_events();

-- Insert default capabilities
INSERT INTO agent_capabilities (capability_name, category, description, parameters_schema) VALUES
('SEO.crawl_website', 'seo', 'Crawl website for technical SEO analysis', '{"site_url": "string", "max_pages": "integer", "crawl_depth": "integer"}'),
('SEO.analyze_technical', 'seo', 'Analyze technical SEO issues', '{"site_url": "string", "check_mobile": "boolean"}'),
('SEO.apply_fixes', 'seo', 'Apply automated technical SEO fixes', '{"site_url": "string", "fix_types": "array"}'),
('CONTENT.generate_article', 'content', 'Generate SEO-optimized article', '{"topic": "string", "keywords": "array", "word_count": "integer"}'),
('CONTENT.optimize_existing', 'content', 'Optimize existing page content', '{"page_url": "string", "target_keywords": "array"}'),
('CMS.strapi_publish', 'cms', 'Publish content to Strapi CMS', '{"content": "object", "publish": "boolean"}'),
('CMS.wordpress_publish', 'cms', 'Publish content to WordPress', '{"content": "object", "publish": "boolean"}'),
('VERIFY.check_changes', 'verification', 'Verify applied changes are working', '{"target_url": "string", "expected_changes": "array"}'),
('GSC.sync_data', 'analytics', 'Sync Google Search Console data', '{"site_url": "string", "date_range": "string"}'),
('SITEMAP.generate_submit', 'seo', 'Generate and submit sitemap', '{"site_url": "string", "submit_to_gsc": "boolean"}'';

-- Create views for common queries
CREATE VIEW agent_active_actions AS
SELECT 
  a.*,
  i.title as idea_title,
  i.hypothesis as idea_hypothesis
FROM agent_actions a
LEFT JOIN agent_ideas i ON a.idea_id = i.id
WHERE a.status IN ('queued', 'scheduled', 'running', 'needs_verification');

CREATE VIEW agent_pending_approvals AS
SELECT 
  a.*,
  COUNT(p.id) as patch_count,
  COUNT(CASE WHEN p.risk_level = 'high' THEN 1 END) as high_risk_patches
FROM agent_actions a
LEFT JOIN agent_runs r ON r.action_id = a.id
LEFT JOIN agent_patches p ON p.run_id = r.id
WHERE a.status = 'proposed'
  AND (a.policy->>'requires_approval')::boolean = true
GROUP BY a.id;

-- Add comments for documentation
COMMENT ON TABLE agent_ideas IS 'Ideas represent evidence-based hypotheses that can be adopted into actionable plans';
COMMENT ON TABLE agent_actions IS 'Actions are concrete, executable units of work derived from ideas';
COMMENT ON TABLE agent_runs IS 'Runs are bounded execution envelopes that safely execute actions within policy limits';
COMMENT ON TABLE agent_patches IS 'Patches are atomic, reversible changes applied to specific page elements';
COMMENT ON TABLE agent_capabilities IS 'Capabilities define what the agent system can do, dynamically discoverable';
COMMENT ON TABLE agent_events IS 'Events provide a complete audit trail of all agent system activity';