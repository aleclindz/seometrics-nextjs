-- Schema Generations Table
-- Tracks schema markup generations by seoagent.js

CREATE TABLE IF NOT EXISTS schema_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_token VARCHAR(255) NOT NULL, -- Website token from seoagent.js
    
    -- Page details
    page_url TEXT NOT NULL,
    
    -- Schema generation details
    schemas_generated INTEGER DEFAULT 0,
    schema_types TEXT[] DEFAULT '{}', -- Array of schema types generated
    
    -- Generation metadata
    generation_method VARCHAR(50) DEFAULT 'smart_js', -- 'smart_js', 'api', 'manual'
    
    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schema_generations_website_token ON schema_generations(website_token);
CREATE INDEX IF NOT EXISTS idx_schema_generations_page_url ON schema_generations(page_url);
CREATE INDEX IF NOT EXISTS idx_schema_generations_generated_at ON schema_generations(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_schema_generations_schema_types ON schema_generations USING GIN(schema_types);

-- Note: No RLS policies needed since this table uses website_token instead of user_token
-- and is accessed by the edge function with service role key