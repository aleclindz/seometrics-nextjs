-- Migration: Semantic Visibility Score (SVS) System
-- Description: Add tables for tracking semantic search optimization scores
-- Date: 2025-08-28

-- SVS Analysis Results Table
CREATE TABLE svs_analyses (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    website_token VARCHAR(255) REFERENCES websites(website_token) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    page_url TEXT, -- NULL for site-wide analysis
    
    -- Overall SVS Score (0-100)
    overall_svs_score INTEGER NOT NULL CHECK (overall_svs_score >= 0 AND overall_svs_score <= 100),
    
    -- Individual Component Scores
    entity_coverage_score INTEGER NOT NULL DEFAULT 0 CHECK (entity_coverage_score >= 0 AND entity_coverage_score <= 20),
    semantic_variety_score INTEGER NOT NULL DEFAULT 0 CHECK (semantic_variety_score >= 0 AND semantic_variety_score <= 15),
    qa_utility_score INTEGER NOT NULL DEFAULT 0 CHECK (qa_utility_score >= 0 AND qa_utility_score <= 15),
    citation_evidence_score INTEGER NOT NULL DEFAULT 0 CHECK (citation_evidence_score >= 0 AND citation_evidence_score <= 15),
    clarity_simplicity_score INTEGER NOT NULL DEFAULT 0 CHECK (clarity_simplicity_score >= 0 AND clarity_simplicity_score <= 10),
    topic_depth_score INTEGER NOT NULL DEFAULT 0 CHECK (topic_depth_score >= 0 AND topic_depth_score <= 15),
    structure_schema_score INTEGER NOT NULL DEFAULT 0 CHECK (structure_schema_score >= 0 AND structure_schema_score <= 10),
    
    -- Detailed Analysis Data
    analysis_data JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata
    analysis_type VARCHAR(50) NOT NULL DEFAULT 'full', -- 'full', 'page', 'content_only'
    content_length INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    
    -- Timestamps
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SVS Recommendations Table
CREATE TABLE svs_recommendations (
    id SERIAL PRIMARY KEY,
    svs_analysis_id INTEGER NOT NULL REFERENCES svs_analyses(id) ON DELETE CASCADE,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Recommendation Details
    category VARCHAR(50) NOT NULL, -- 'entity_coverage', 'semantic_variety', etc.
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    potential_points INTEGER NOT NULL DEFAULT 0, -- Potential SVS score improvement
    
    -- Implementation Details
    implementation_type VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'auto_fixable', 'manual', 'semi_automatic'
    action_data JSONB DEFAULT '{}',
    
    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'implemented', 'declined', 'not_applicable'
    implemented_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SVS Benchmarks Table (for industry comparisons)
CREATE TABLE svs_benchmarks (
    id SERIAL PRIMARY KEY,
    industry VARCHAR(100) NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'blog', 'product', 'landing', 'general'
    
    -- Benchmark Scores
    avg_overall_score DECIMAL(5,2) NOT NULL,
    avg_entity_coverage DECIMAL(5,2) NOT NULL,
    avg_semantic_variety DECIMAL(5,2) NOT NULL,
    avg_qa_utility DECIMAL(5,2) NOT NULL,
    avg_citation_evidence DECIMAL(5,2) NOT NULL,
    avg_clarity_simplicity DECIMAL(5,2) NOT NULL,
    avg_topic_depth DECIMAL(5,2) NOT NULL,
    avg_structure_schema DECIMAL(5,2) NOT NULL,
    
    -- Metadata
    sample_size INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_svs_analyses_user_token ON svs_analyses(user_token);
CREATE INDEX idx_svs_analyses_site_url ON svs_analyses(site_url);
CREATE INDEX idx_svs_analyses_analyzed_at ON svs_analyses(analyzed_at DESC);
CREATE INDEX idx_svs_analyses_overall_score ON svs_analyses(overall_svs_score);
CREATE INDEX idx_svs_analyses_website_token ON svs_analyses(website_token);

CREATE INDEX idx_svs_recommendations_analysis_id ON svs_recommendations(svs_analysis_id);
CREATE INDEX idx_svs_recommendations_user_token ON svs_recommendations(user_token);
CREATE INDEX idx_svs_recommendations_status ON svs_recommendations(status);
CREATE INDEX idx_svs_recommendations_priority ON svs_recommendations(priority);

CREATE INDEX idx_svs_benchmarks_industry ON svs_benchmarks(industry);
CREATE INDEX idx_svs_benchmarks_content_type ON svs_benchmarks(content_type);

-- Row Level Security (RLS) Policies
ALTER TABLE svs_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE svs_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE svs_benchmarks ENABLE ROW LEVEL SECURITY;

-- SVS Analyses: Users can only see their own analyses
CREATE POLICY "Users can view their own SVS analyses" ON svs_analyses
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own SVS analyses" ON svs_analyses
    FOR INSERT WITH CHECK (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own SVS analyses" ON svs_analyses
    FOR UPDATE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- SVS Recommendations: Users can only see their own recommendations
CREATE POLICY "Users can view their own SVS recommendations" ON svs_recommendations
    FOR SELECT USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own SVS recommendations" ON svs_recommendations
    FOR INSERT WITH CHECK (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own SVS recommendations" ON svs_recommendations
    FOR UPDATE USING (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- SVS Benchmarks: All authenticated users can read benchmarks
CREATE POLICY "Authenticated users can view SVS benchmarks" ON svs_benchmarks
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only service role can modify benchmarks
CREATE POLICY "Service role can manage SVS benchmarks" ON svs_benchmarks
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert Initial Industry Benchmarks
INSERT INTO svs_benchmarks (industry, content_type, avg_overall_score, avg_entity_coverage, avg_semantic_variety, avg_qa_utility, avg_citation_evidence, avg_clarity_simplicity, avg_topic_depth, avg_structure_schema, sample_size) VALUES
('SaaS', 'general', 72.5, 15.2, 11.8, 10.5, 9.2, 7.8, 11.5, 6.5, 500),
('SaaS', 'blog', 68.3, 14.1, 10.9, 12.2, 8.1, 8.2, 10.8, 4.0, 300),
('SaaS', 'product', 76.8, 16.5, 12.3, 9.8, 11.2, 7.5, 12.5, 7.0, 200),
('E-commerce', 'general', 69.2, 14.8, 10.5, 9.2, 8.5, 8.1, 12.1, 6.0, 400),
('E-commerce', 'product', 74.1, 17.2, 11.8, 8.5, 10.1, 7.8, 13.2, 5.5, 600),
('Marketing Agency', 'general', 71.8, 15.5, 12.1, 11.8, 10.2, 8.0, 10.5, 3.7, 200),
('Marketing Agency', 'blog', 75.2, 16.1, 13.2, 13.5, 11.8, 8.5, 9.8, 2.3, 150),
('Technology', 'general', 70.5, 14.9, 11.5, 10.8, 9.8, 7.2, 11.8, 4.5, 350),
('Healthcare', 'general', 78.2, 16.8, 12.5, 12.8, 12.5, 8.8, 12.5, 2.3, 100),
('Finance', 'general', 74.8, 15.8, 11.2, 11.5, 11.8, 8.2, 11.5, 4.8, 150);

-- Add helpful comments
COMMENT ON TABLE svs_analyses IS 'Semantic Visibility Score analysis results for websites and individual pages';
COMMENT ON TABLE svs_recommendations IS 'Actionable recommendations to improve SVS scores';
COMMENT ON TABLE svs_benchmarks IS 'Industry benchmark data for SVS score comparisons';

COMMENT ON COLUMN svs_analyses.overall_svs_score IS 'Combined SVS score from 0-100, sum of all component scores';
COMMENT ON COLUMN svs_analyses.analysis_data IS 'Detailed analysis including entities found, semantic patterns, recommendations, etc.';
COMMENT ON COLUMN svs_recommendations.potential_points IS 'Estimated SVS score improvement if recommendation is implemented';
COMMENT ON COLUMN svs_recommendations.implementation_type IS 'Whether recommendation can be auto-fixed, needs manual work, or semi-automatic';