-- Strategy Discovery System
-- Implements Master Discovery Prompt with Firecrawl integration
-- Tracks pillar/supporting article structure and section mapping

-- Track strategy discovery runs
CREATE TABLE IF NOT EXISTS strategy_discoveries (
  id SERIAL PRIMARY KEY,
  website_token TEXT NOT NULL REFERENCES websites(website_token) ON DELETE CASCADE,
  discovery_type TEXT NOT NULL CHECK (discovery_type IN ('initial', 'refresh', 'manual')),

  -- Input data (matching Master Discovery schema)
  input_site JSONB NOT NULL, -- {brand, domain, geo_focus[], seed_topics[]}
  input_sources JSONB, -- {seed_urls[], raw_owner_context}
  input_controls JSONB, -- {max_clusters, min_clusters, map_sections, include_local_slices}

  -- Output data (full discovery JSON)
  output_clusters JSONB NOT NULL, -- clusters[]
  output_articles JSONB NOT NULL, -- articles[]
  output_section_maps JSONB, -- section_maps[]
  output_changes TEXT[], -- changes log

  scrape_log JSONB, -- {seed_urls, pages_fetched, notes}

  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enhanced topic clusters (matches "clusters" in discovery output)
CREATE TABLE IF NOT EXISTS topic_clusters (
  id SERIAL PRIMARY KEY,
  website_token TEXT NOT NULL REFERENCES websites(website_token) ON DELETE CASCADE,
  discovery_id INTEGER REFERENCES strategy_discoveries(id) ON DELETE SET NULL,

  -- From discovery output
  cluster_name TEXT NOT NULL, -- pillar_title from discovery
  primary_keyword TEXT NOT NULL,
  secondary_keywords TEXT[] DEFAULT '{}',
  notes TEXT,

  -- Metadata
  pillar_count INTEGER DEFAULT 0,
  supporting_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(website_token, cluster_name)
);

-- Track article roles (pillar vs supporting) with section mapping
CREATE TABLE IF NOT EXISTS article_roles (
  id SERIAL PRIMARY KEY,
  website_token TEXT NOT NULL REFERENCES websites(website_token) ON DELETE CASCADE,
  discovery_id INTEGER REFERENCES strategy_discoveries(id) ON DELETE SET NULL,

  -- Link to article systems
  article_brief_id BIGINT REFERENCES article_briefs(id) ON DELETE CASCADE,
  article_queue_id INTEGER REFERENCES article_queue(id) ON DELETE CASCADE,

  -- From discovery "articles" array
  discovery_article_id TEXT NOT NULL, -- e.g., "pill_imports_fl"
  role TEXT NOT NULL CHECK (role IN ('PILLAR', 'SUPPORTING')),
  title TEXT NOT NULL,
  primary_keyword TEXT NOT NULL,
  secondary_keywords TEXT[] DEFAULT '{}',

  -- Relationships
  topic_cluster_id INTEGER REFERENCES topic_clusters(id) ON DELETE CASCADE,
  links_to_article_ids TEXT[], -- discovery IDs this article links to

  -- Section mapping (for PILLAR articles)
  section_map JSONB, -- [{"type": "H2|FAQ", "heading": "...", "absorbs": ["keyword"]}]

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(website_token, discovery_article_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_strategy_discoveries_website_token ON strategy_discoveries(website_token);
CREATE INDEX IF NOT EXISTS idx_strategy_discoveries_status ON strategy_discoveries(status);
CREATE INDEX IF NOT EXISTS idx_strategy_discoveries_discovery_type ON strategy_discoveries(discovery_type);

CREATE INDEX IF NOT EXISTS idx_topic_clusters_website_token ON topic_clusters(website_token);
CREATE INDEX IF NOT EXISTS idx_topic_clusters_discovery_id ON topic_clusters(discovery_id);
CREATE INDEX IF NOT EXISTS idx_topic_clusters_cluster_name ON topic_clusters(website_token, cluster_name);

CREATE INDEX IF NOT EXISTS idx_article_roles_website_token ON article_roles(website_token);
CREATE INDEX IF NOT EXISTS idx_article_roles_discovery_id ON article_roles(discovery_id);
CREATE INDEX IF NOT EXISTS idx_article_roles_role ON article_roles(role);
CREATE INDEX IF NOT EXISTS idx_article_roles_topic_cluster_id ON article_roles(topic_cluster_id);
CREATE INDEX IF NOT EXISTS idx_article_roles_discovery_article_id ON article_roles(website_token, discovery_article_id);

-- Add updated_at trigger for topic_clusters
CREATE TRIGGER set_timestamp_topic_clusters
  BEFORE UPDATE ON topic_clusters
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Alter existing tables to track strategy status

-- Track strategy status on websites
ALTER TABLE websites
  ADD COLUMN IF NOT EXISTS strategy_initialized BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS strategy_initialized_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_discovery_id INTEGER REFERENCES strategy_discoveries(id);

-- Enhance article_briefs with strategy concepts
ALTER TABLE article_briefs
  ADD COLUMN IF NOT EXISTS article_role TEXT CHECK (article_role IN ('PILLAR', 'SUPPORTING')),
  ADD COLUMN IF NOT EXISTS discovery_article_id TEXT,
  ADD COLUMN IF NOT EXISTS topic_cluster_id INTEGER REFERENCES topic_clusters(id),
  ADD COLUMN IF NOT EXISTS section_map JSONB;

-- Track which articles came from discovery
ALTER TABLE article_queue
  ADD COLUMN IF NOT EXISTS discovery_article_id TEXT,
  ADD COLUMN IF NOT EXISTS article_role TEXT CHECK (article_role IN ('PILLAR', 'SUPPORTING'));

-- Update keyword_similarity_groups to reference topic_clusters
ALTER TABLE keyword_similarity_groups
  ADD COLUMN IF NOT EXISTS topic_cluster_id INTEGER REFERENCES topic_clusters(id);

-- Enable RLS
ALTER TABLE strategy_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strategy_discoveries
CREATE POLICY "Users can view their own strategy discoveries" ON strategy_discoveries
  FOR SELECT USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can insert strategy discoveries for their websites" ON strategy_discoveries
  FOR INSERT WITH CHECK (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can update their own strategy discoveries" ON strategy_discoveries
  FOR UPDATE USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

-- RLS Policies for topic_clusters
CREATE POLICY "Users can view their own topic clusters" ON topic_clusters
  FOR SELECT USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can insert topic clusters for their websites" ON topic_clusters
  FOR INSERT WITH CHECK (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can update their own topic clusters" ON topic_clusters
  FOR UPDATE USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can delete their own topic clusters" ON topic_clusters
  FOR DELETE USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

-- RLS Policies for article_roles
CREATE POLICY "Users can view their own article roles" ON article_roles
  FOR SELECT USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can insert article roles for their websites" ON article_roles
  FOR INSERT WITH CHECK (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can update their own article roles" ON article_roles
  FOR UPDATE USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can delete their own article roles" ON article_roles
  FOR DELETE USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

-- Utility views for strategy overview

-- View to get strategy status by website
CREATE OR REPLACE VIEW strategy_status_overview AS
SELECT
  w.website_token,
  w.domain,
  w.strategy_initialized,
  w.strategy_initialized_at,
  w.last_discovery_id,
  sd.discovery_type,
  sd.status as discovery_status,
  sd.created_at as discovery_created_at,
  COUNT(DISTINCT tc.id) as cluster_count,
  COUNT(DISTINCT CASE WHEN ar.role = 'PILLAR' THEN ar.id END) as pillar_count,
  COUNT(DISTINCT CASE WHEN ar.role = 'SUPPORTING' THEN ar.id END) as supporting_count
FROM websites w
LEFT JOIN strategy_discoveries sd ON w.last_discovery_id = sd.id
LEFT JOIN topic_clusters tc ON w.website_token = tc.website_token
LEFT JOIN article_roles ar ON w.website_token = ar.website_token
GROUP BY w.website_token, w.domain, w.strategy_initialized, w.strategy_initialized_at, w.last_discovery_id, sd.discovery_type, sd.status, sd.created_at;

-- View to get cluster details with article counts
CREATE OR REPLACE VIEW cluster_details_view AS
SELECT
  tc.id as cluster_id,
  tc.website_token,
  w.domain,
  tc.cluster_name,
  tc.primary_keyword,
  tc.secondary_keywords,
  tc.notes,
  tc.pillar_count,
  tc.supporting_count,
  COUNT(DISTINCT ar.id) as total_articles,
  COUNT(DISTINCT CASE WHEN ar.role = 'PILLAR' THEN ar.id END) as actual_pillar_count,
  COUNT(DISTINCT CASE WHEN ar.role = 'SUPPORTING' THEN ar.id END) as actual_supporting_count,
  tc.created_at,
  tc.updated_at
FROM topic_clusters tc
JOIN websites w ON tc.website_token = w.website_token
LEFT JOIN article_roles ar ON tc.id = ar.topic_cluster_id
GROUP BY tc.id, tc.website_token, w.domain, tc.cluster_name, tc.primary_keyword, tc.secondary_keywords, tc.notes, tc.pillar_count, tc.supporting_count, tc.created_at, tc.updated_at;

COMMENT ON TABLE strategy_discoveries IS 'Stores Master Discovery runs with input/output JSON';
COMMENT ON TABLE topic_clusters IS 'Semantic keyword clusters from discovery (pillar_title from discovery output)';
COMMENT ON TABLE article_roles IS 'Tracks PILLAR vs SUPPORTING articles with section mapping';
COMMENT ON COLUMN article_roles.section_map IS 'Maps secondary keywords to H2/FAQ sections for PILLAR articles';
COMMENT ON COLUMN article_roles.links_to_article_ids IS 'For SUPPORTING: discovery IDs of pillar articles it should link to';
