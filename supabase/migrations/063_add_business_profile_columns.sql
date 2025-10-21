-- Migration: Add business profile detection columns to websites table
-- Purpose: Support automated business profiling via LLM analysis
-- Date: 2025-10-21

-- Add business profile columns to websites table
ALTER TABLE websites
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS business_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS business_detection_confidence DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS business_detection_signals JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS business_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS business_updated_at TIMESTAMP WITH TIME ZONE;

-- Add index for querying by business_type
CREATE INDEX IF NOT EXISTS idx_websites_business_type ON websites(business_type);

-- Add index for querying recently updated business profiles
CREATE INDEX IF NOT EXISTS idx_websites_business_updated_at ON websites(business_updated_at DESC);

-- Add comment explaining the columns
COMMENT ON COLUMN websites.business_type IS 'Auto-detected business type: product, saas, service, content, marketplace, tool, app, nonprofit, community, or unknown';
COMMENT ON COLUMN websites.business_info IS 'JSON object with business details: {description, audience, valueProps, productsServices, niche}';
COMMENT ON COLUMN websites.business_detection_confidence IS 'LLM confidence score for business detection (0.0 to 1.0)';
COMMENT ON COLUMN websites.business_detection_signals IS 'Array of detection signals that led to business type classification';
COMMENT ON COLUMN websites.business_confirmed IS 'Whether user has manually confirmed/edited the business profile';
COMMENT ON COLUMN websites.business_updated_at IS 'Timestamp of last business profile detection/update';
