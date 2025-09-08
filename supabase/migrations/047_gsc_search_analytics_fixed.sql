-- Migration 047: GSC Search Analytics Dimensional Table (Fixed)
-- Based on GPT-5 recommendations for proper GSC performance dashboard
-- Creates a dimensional fact table for detailed GSC analytics

-- Create the dimensional GSC search analytics table
CREATE TABLE IF NOT EXISTS gsc_search_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  start_date DATE NOT NULL,   -- same as end_date for daily grains
  end_date DATE NOT NULL,
  date DATE,                  -- when you include "date" as a dimension
  search_type TEXT NOT NULL DEFAULT 'WEB',   -- WEB | IMAGE | VIDEO | NEWS
  data_state TEXT NOT NULL DEFAULT 'FINAL',  -- FINAL | ALL
  query TEXT,
  page TEXT,
  country TEXT,
  device TEXT,
  appearance TEXT,            -- searchAppearance (rich results, etc.)
  clicks DOUBLE PRECISION NOT NULL DEFAULT 0,
  impressions DOUBLE PRECISION NOT NULL DEFAULT 0,
  ctr DOUBLE PRECISION NOT NULL DEFAULT 0,
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a unique index that handles NULLs properly for dimensional uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS gsc_analytics_dimensional_unique 
ON gsc_search_analytics (
  user_token, 
  site_url, 
  search_type, 
  data_state,
  COALESCE(date, start_date),
  COALESCE(query, ''), 
  COALESCE(page, ''), 
  COALESCE(country, ''),
  COALESCE(device, ''), 
  COALESCE(appearance, '')
);

-- Helpful indexes for common dashboard queries
CREATE INDEX IF NOT EXISTS gsc_sa_user_site_idx ON gsc_search_analytics (user_token, site_url);
CREATE INDEX IF NOT EXISTS gsc_sa_date_idx ON gsc_search_analytics (date) WHERE date IS NOT NULL;
CREATE INDEX IF NOT EXISTS gsc_sa_page_idx ON gsc_search_analytics (page) WHERE page IS NOT NULL;
CREATE INDEX IF NOT EXISTS gsc_sa_query_idx ON gsc_search_analytics (query) WHERE query IS NOT NULL;
CREATE INDEX IF NOT EXISTS gsc_sa_site_date_idx ON gsc_search_analytics (site_url, date) WHERE date IS NOT NULL;
CREATE INDEX IF NOT EXISTS gsc_sa_clicks_idx ON gsc_search_analytics (clicks DESC) WHERE clicks > 0;
CREATE INDEX IF NOT EXISTS gsc_sa_impressions_idx ON gsc_search_analytics (impressions DESC) WHERE impressions > 0;

-- RLS Policy for user data isolation
ALTER TABLE gsc_search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own GSC analytics data" ON gsc_search_analytics
    FOR ALL
    USING (user_token = current_setting('request.jwt.claims', true)::json->>'token');

-- Grant permissions to service role for API access
GRANT ALL ON gsc_search_analytics TO service_role;
GRANT SELECT ON gsc_search_analytics TO authenticated;

-- Add helpful comments
COMMENT ON TABLE gsc_search_analytics IS 'Dimensional fact table for Google Search Console Search Analytics API data. Each row represents metrics for specific dimension combinations (query, page, date, device, country, etc.)';
COMMENT ON COLUMN gsc_search_analytics.date IS 'Daily date dimension - NULL for aggregated periods';
COMMENT ON COLUMN gsc_search_analytics.query IS 'Search query dimension - NULL for page-only aggregations';
COMMENT ON COLUMN gsc_search_analytics.page IS 'Landing page URL dimension - NULL for query-only aggregations';
COMMENT ON COLUMN gsc_search_analytics.appearance IS 'Search appearance type (rich results, featured snippets, etc.)';
COMMENT ON COLUMN gsc_search_analytics.data_state IS 'GSC data freshness: FINAL (confirmed) or ALL (includes fresh data)';