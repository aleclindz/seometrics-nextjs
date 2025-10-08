-- Keyword Similarity Clustering System
-- Pre-computed keyword similarity groups for efficient article planning

CREATE TABLE IF NOT EXISTS keyword_similarity_groups (
  id SERIAL PRIMARY KEY,
  website_token TEXT NOT NULL REFERENCES websites(website_token) ON DELETE CASCADE,
  topic_cluster TEXT NOT NULL,
  group_id INTEGER NOT NULL, -- Sequential ID within the topic cluster (1, 2, 3...)
  keywords TEXT[] NOT NULL, -- Array of keywords in this similarity group
  primary_keyword TEXT NOT NULL, -- The main keyword (usually highest volume)
  secondary_keywords TEXT[] DEFAULT '{}', -- Supporting keywords
  average_similarity_score DECIMAL(4,3), -- Average cosine similarity within group (0.000-1.000)
  recommended_article_count INTEGER DEFAULT 1, -- Usually 1 article per 5-10 keywords
  article_brief_id BIGINT REFERENCES article_briefs(id) ON DELETE SET NULL, -- Link to generated brief
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(website_token, topic_cluster, group_id)
);

CREATE INDEX idx_similarity_groups_cluster ON keyword_similarity_groups(website_token, topic_cluster);
CREATE INDEX idx_similarity_groups_brief ON keyword_similarity_groups(article_brief_id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_similarity_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_similarity_groups_timestamp ON keyword_similarity_groups;
CREATE TRIGGER set_similarity_groups_timestamp
  BEFORE UPDATE ON keyword_similarity_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_similarity_groups_timestamp();

-- Enable RLS
ALTER TABLE keyword_similarity_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their keyword similarity groups" ON keyword_similarity_groups
  FOR SELECT USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can insert keyword similarity groups for their websites" ON keyword_similarity_groups
  FOR INSERT WITH CHECK (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can update their keyword similarity groups" ON keyword_similarity_groups
  FOR UPDATE USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can delete their keyword similarity groups" ON keyword_similarity_groups
  FOR DELETE USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

-- Utility view: Summary of similarity groups per cluster
CREATE OR REPLACE VIEW similarity_groups_summary AS
SELECT
  ksg.website_token,
  w.domain,
  ksg.topic_cluster,
  COUNT(DISTINCT ksg.group_id) as total_groups,
  SUM(array_length(ksg.keywords, 1)) as total_keywords_grouped,
  AVG(array_length(ksg.keywords, 1)) as avg_keywords_per_group,
  COUNT(DISTINCT ksg.article_brief_id) FILTER (WHERE ksg.article_brief_id IS NOT NULL) as briefs_generated
FROM keyword_similarity_groups ksg
JOIN websites w ON ksg.website_token = w.website_token
GROUP BY ksg.website_token, w.domain, ksg.topic_cluster;
