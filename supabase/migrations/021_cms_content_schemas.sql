-- Migration: Create CMS Content Schemas table for storing Strapi field mappings
-- This enables dynamic article publishing based on discovered content type schemas

-- Create cms_content_schemas table
CREATE TABLE cms_content_schemas (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER REFERENCES cms_connections(id) ON DELETE CASCADE,
  content_type_name TEXT NOT NULL, -- e.g., "api::blog-post::blog-post"
  schema_data JSONB NOT NULL, -- Complete schema definition from Strapi
  fields_config JSONB NOT NULL, -- Processed field mappings for easy access
  is_primary BOOLEAN DEFAULT FALSE, -- Mark the primary content type for this connection
  last_discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique content type per connection
  UNIQUE(connection_id, content_type_name)
);

-- Create indexes for performance
CREATE INDEX idx_cms_content_schemas_connection_id ON cms_content_schemas(connection_id);
CREATE INDEX idx_cms_content_schemas_content_type ON cms_content_schemas(content_type_name);
CREATE INDEX idx_cms_content_schemas_primary ON cms_content_schemas(connection_id, is_primary) WHERE is_primary = true;

-- Create RLS policies
ALTER TABLE cms_content_schemas ENABLE ROW LEVEL SECURITY;

-- Users can only see schemas for connections they own
CREATE POLICY "Users can view their own CMS schemas" ON cms_content_schemas
  FOR SELECT 
  USING (
    connection_id IN (
      SELECT id FROM cms_connections 
      WHERE user_token = auth.jwt() ->> 'user_token'
    )
  );

-- Users can insert schemas for their own connections
CREATE POLICY "Users can create schemas for their connections" ON cms_content_schemas
  FOR INSERT 
  WITH CHECK (
    connection_id IN (
      SELECT id FROM cms_connections 
      WHERE user_token = auth.jwt() ->> 'user_token'
    )
  );

-- Users can update schemas for their own connections
CREATE POLICY "Users can update their own CMS schemas" ON cms_content_schemas
  FOR UPDATE 
  USING (
    connection_id IN (
      SELECT id FROM cms_connections 
      WHERE user_token = auth.jwt() ->> 'user_token'
    )
  );

-- Users can delete schemas for their own connections
CREATE POLICY "Users can delete their own CMS schemas" ON cms_content_schemas
  FOR DELETE 
  USING (
    connection_id IN (
      SELECT id FROM cms_connections 
      WHERE user_token = auth.jwt() ->> 'user_token'
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_cms_content_schemas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_cms_content_schemas_updated_at
  BEFORE UPDATE ON cms_content_schemas
  FOR EACH ROW
  EXECUTE FUNCTION update_cms_content_schemas_updated_at();

-- Add helpful comments
COMMENT ON TABLE cms_content_schemas IS 'Stores Strapi content type schemas discovered during CMS connection testing';
COMMENT ON COLUMN cms_content_schemas.content_type_name IS 'Strapi content type identifier (e.g., api::blog-post::blog-post)';
COMMENT ON COLUMN cms_content_schemas.schema_data IS 'Raw schema data from Strapi Content-Type Builder API';
COMMENT ON COLUMN cms_content_schemas.fields_config IS 'Processed field configuration for easier programmatic access';
COMMENT ON COLUMN cms_content_schemas.is_primary IS 'Indicates the preferred content type for article publishing';