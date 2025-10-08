-- Keyword Coverage Tracking System
-- Implements keyword-to-article mapping with similarity clustering and mention tracking

-- Enable pgvector extension for embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embeddings for keyword similarity calculations (using pgvector extension)
ALTER TABLE website_keywords ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE website_keywords ADD COLUMN IF NOT EXISTS similarity_cluster_id INTEGER;

-- Add constraint: max 100 keywords per topic cluster
-- Implemented as a trigger since we need to count records
CREATE OR REPLACE FUNCTION check_topic_cluster_keyword_limit()
RETURNS TRIGGER AS $$
DECLARE
  keyword_count INTEGER;
BEGIN
  -- Only check if a topic cluster is assigned
  IF NEW.topic_cluster IS NOT NULL THEN
    SELECT COUNT(*) INTO keyword_count
    FROM website_keywords
    WHERE website_token = NEW.website_token
    AND topic_cluster = NEW.topic_cluster;

    IF keyword_count >= 100 THEN
      RAISE EXCEPTION 'Topic cluster "%" has reached maximum of 100 keywords. Consider splitting into multiple clusters for better focus.', NEW.topic_cluster;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_cluster_keyword_limit ON website_keywords;
CREATE TRIGGER enforce_cluster_keyword_limit
  BEFORE INSERT ON website_keywords
  FOR EACH ROW
  EXECUTE FUNCTION check_topic_cluster_keyword_limit();

-- Track keyword mentions in articles
CREATE TABLE IF NOT EXISTS keyword_mentions (
  id SERIAL PRIMARY KEY,
  article_queue_id INTEGER NOT NULL REFERENCES article_queue(id) ON DELETE CASCADE,
  website_token TEXT NOT NULL REFERENCES websites(website_token) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  mention_count INTEGER DEFAULT 1,
  mention_type TEXT CHECK (mention_type IN ('primary', 'secondary', 'contextual')) DEFAULT 'secondary',
  locations JSONB DEFAULT '[]', -- Array of where keyword appears: ["H2: heading", "Section: excerpt"]
  first_mentioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(article_queue_id, keyword)
);

CREATE INDEX idx_keyword_mentions_keyword ON keyword_mentions(website_token, keyword);
CREATE INDEX idx_keyword_mentions_article ON keyword_mentions(article_queue_id);
CREATE INDEX idx_keyword_mentions_type ON keyword_mentions(mention_type);

-- Add keyword tracking to briefs
ALTER TABLE article_briefs ADD COLUMN IF NOT EXISTS target_keyword_ids INTEGER[] DEFAULT '{}';
ALTER TABLE article_briefs ADD COLUMN IF NOT EXISTS coverage_keywords JSONB DEFAULT '{"primary": "", "secondary": []}';

-- Add keyword tracking to articles
ALTER TABLE article_queue ADD COLUMN IF NOT EXISTS mentioned_keywords JSONB DEFAULT '[]';
ALTER TABLE article_queue ADD COLUMN IF NOT EXISTS keyword_coverage_score DECIMAL(4,2); -- 0.00 to 1.00

-- Update trigger for keyword_mentions
CREATE OR REPLACE FUNCTION update_keyword_mentions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_keyword_mentions_timestamp ON keyword_mentions;
CREATE TRIGGER set_keyword_mentions_timestamp
  BEFORE UPDATE ON keyword_mentions
  FOR EACH ROW
  EXECUTE FUNCTION update_keyword_mentions_timestamp();

-- Enable RLS on keyword_mentions
ALTER TABLE keyword_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for keyword_mentions
CREATE POLICY "Users can view their keyword mentions" ON keyword_mentions
  FOR SELECT USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can insert keyword mentions for their websites" ON keyword_mentions
  FOR INSERT WITH CHECK (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can update their keyword mentions" ON keyword_mentions
  FOR UPDATE USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

CREATE POLICY "Users can delete their keyword mentions" ON keyword_mentions
  FOR DELETE USING (
    website_token IN (
      SELECT website_token FROM websites WHERE user_token = current_setting('app.current_user_token', true)
    )
  );

-- Utility view: Keyword coverage overview per website
CREATE OR REPLACE VIEW keyword_coverage_overview AS
SELECT
  wk.website_token,
  w.domain,
  wk.topic_cluster,
  wk.keyword,
  COUNT(DISTINCT km.article_queue_id) as articles_mentioning,
  SUM(km.mention_count) as total_mentions,
  MAX(km.first_mentioned_at) as last_mentioned_at,
  ARRAY_AGG(DISTINCT aq.title ORDER BY aq.title) FILTER (WHERE aq.title IS NOT NULL) as article_titles,
  CASE
    WHEN COUNT(DISTINCT km.article_queue_id) = 0 THEN 'uncovered'
    WHEN COUNT(DISTINCT km.article_queue_id) = 1 THEN 'covered'
    ELSE 'multiple_coverage'
  END as coverage_status
FROM website_keywords wk
JOIN websites w ON wk.website_token = w.website_token
LEFT JOIN keyword_mentions km ON wk.website_token = km.website_token AND wk.keyword = km.keyword
LEFT JOIN article_queue aq ON km.article_queue_id = aq.id
GROUP BY wk.website_token, w.domain, wk.topic_cluster, wk.keyword;

-- Utility view: Topic cluster coverage statistics
CREATE OR REPLACE VIEW topic_cluster_coverage_stats AS
SELECT
  wk.website_token,
  w.domain,
  wk.topic_cluster,
  COUNT(DISTINCT wk.keyword) as total_keywords,
  COUNT(DISTINCT CASE WHEN km.id IS NOT NULL THEN wk.keyword END) as covered_keywords,
  COUNT(DISTINCT CASE WHEN km.id IS NULL THEN wk.keyword END) as uncovered_keywords,
  ROUND(
    CAST(COUNT(DISTINCT CASE WHEN km.id IS NOT NULL THEN wk.keyword END) AS DECIMAL) /
    NULLIF(COUNT(DISTINCT wk.keyword), 0) * 100,
    1
  ) as coverage_percentage,
  COUNT(DISTINCT aq.id) as articles_in_cluster
FROM website_keywords wk
JOIN websites w ON wk.website_token = w.website_token
LEFT JOIN keyword_mentions km ON wk.website_token = km.website_token AND wk.keyword = km.keyword
LEFT JOIN article_queue aq ON km.article_queue_id = aq.id AND aq.status IN ('generated', 'published')
WHERE wk.topic_cluster IS NOT NULL
GROUP BY wk.website_token, w.domain, wk.topic_cluster;
