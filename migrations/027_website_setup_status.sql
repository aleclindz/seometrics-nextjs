-- Migration: Website Setup Status Tracking
-- Purpose: Track website setup progress and status for enhanced SEOAgent guidance
-- Created: 2025-08-27

CREATE TABLE website_setup_status (
  id SERIAL PRIMARY KEY,
  user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  
  -- Setup status for each component
  gsc_status VARCHAR(20) DEFAULT 'none' CHECK (gsc_status IN ('connected', 'pending', 'error', 'none')),
  gsc_connected_at TIMESTAMP WITH TIME ZONE,
  gsc_last_checked TIMESTAMP WITH TIME ZONE,
  gsc_error_message TEXT,
  
  seoagentjs_status VARCHAR(20) DEFAULT 'inactive' CHECK (seoagentjs_status IN ('active', 'inactive', 'error')),
  seoagentjs_last_active TIMESTAMP WITH TIME ZONE,
  seoagentjs_last_checked TIMESTAMP WITH TIME ZONE,
  seoagentjs_error_message TEXT,
  
  cms_status VARCHAR(20) DEFAULT 'none' CHECK (cms_status IN ('connected', 'pending', 'error', 'none')),
  cms_type VARCHAR(50), -- 'wordpress', 'strapi', 'webflow', 'shopify', 'ghost'
  cms_connected_at TIMESTAMP WITH TIME ZONE,
  cms_last_checked TIMESTAMP WITH TIME ZONE,
  cms_error_message TEXT,
  
  hosting_status VARCHAR(20) DEFAULT 'none' CHECK (hosting_status IN ('connected', 'pending', 'error', 'none')),
  hosting_provider VARCHAR(50), -- 'vercel', 'netlify', 'cloudflare', 'aws', etc.
  hosting_connected_at TIMESTAMP WITH TIME ZONE,
  hosting_last_checked TIMESTAMP WITH TIME ZONE,
  hosting_error_message TEXT,
  
  -- Overall setup tracking
  setup_progress INTEGER DEFAULT 0 CHECK (setup_progress >= 0 AND setup_progress <= 100),
  is_fully_setup BOOLEAN DEFAULT FALSE,
  setup_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- User preferences and tracking
  setup_dismissed BOOLEAN DEFAULT FALSE,
  setup_dismissed_at TIMESTAMP WITH TIME ZONE,
  first_setup_reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user-domain combination
  UNIQUE(user_token, domain)
);

-- Create indexes for performance
CREATE INDEX idx_website_setup_status_user_domain ON website_setup_status(user_token, domain);
CREATE INDEX idx_website_setup_status_setup_progress ON website_setup_status(setup_progress);
CREATE INDEX idx_website_setup_status_fully_setup ON website_setup_status(is_fully_setup);
CREATE INDEX idx_website_setup_status_updated_at ON website_setup_status(updated_at);

-- Enable Row Level Security
ALTER TABLE website_setup_status ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own setup status records
CREATE POLICY "Users can manage their own setup status" ON website_setup_status
  FOR ALL USING (user_token = current_user_token());

-- Create function to automatically update setup_progress and is_fully_setup
CREATE OR REPLACE FUNCTION calculate_setup_progress() RETURNS TRIGGER AS $$
BEGIN
  DECLARE
    progress_count INTEGER := 0;
  BEGIN
    -- Count completed setup items
    IF NEW.gsc_status = 'connected' THEN
      progress_count := progress_count + 1;
    END IF;
    
    IF NEW.seoagentjs_status = 'active' THEN
      progress_count := progress_count + 1;
    END IF;
    
    IF NEW.cms_status = 'connected' THEN
      progress_count := progress_count + 1;
    END IF;
    
    IF NEW.hosting_status = 'connected' THEN
      progress_count := progress_count + 1;
    END IF;
    
    -- Calculate percentage (out of 4 components)
    NEW.setup_progress := (progress_count * 100) / 4;
    
    -- Update fully setup status
    NEW.is_fully_setup := (progress_count = 4);
    
    -- Set completion timestamp if just completed
    IF NEW.is_fully_setup = TRUE AND OLD.is_fully_setup = FALSE THEN
      NEW.setup_completed_at := NOW();
    END IF;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate setup progress
CREATE TRIGGER setup_progress_trigger
  BEFORE UPDATE ON website_setup_status
  FOR EACH ROW
  EXECUTE FUNCTION calculate_setup_progress();

-- Create trigger for INSERT as well
CREATE TRIGGER setup_progress_insert_trigger
  BEFORE INSERT ON website_setup_status
  FOR EACH ROW
  EXECUTE FUNCTION calculate_setup_progress();

-- Create function to upsert website setup status
CREATE OR REPLACE FUNCTION upsert_website_setup_status(
  p_user_token VARCHAR(255),
  p_domain TEXT,
  p_gsc_status VARCHAR(20) DEFAULT NULL,
  p_seoagentjs_status VARCHAR(20) DEFAULT NULL,
  p_cms_status VARCHAR(20) DEFAULT NULL,
  p_cms_type VARCHAR(50) DEFAULT NULL,
  p_hosting_status VARCHAR(20) DEFAULT NULL,
  p_hosting_provider VARCHAR(50) DEFAULT NULL
) RETURNS website_setup_status AS $$
DECLARE
  result website_setup_status;
BEGIN
  INSERT INTO website_setup_status (
    user_token,
    domain,
    gsc_status,
    seoagentjs_status,
    cms_status,
    cms_type,
    hosting_status,
    hosting_provider,
    gsc_last_checked,
    seoagentjs_last_checked,
    cms_last_checked,
    hosting_last_checked
  ) VALUES (
    p_user_token,
    p_domain,
    COALESCE(p_gsc_status, 'none'),
    COALESCE(p_seoagentjs_status, 'inactive'),
    COALESCE(p_cms_status, 'none'),
    p_cms_type,
    COALESCE(p_hosting_status, 'none'),
    p_hosting_provider,
    CASE WHEN p_gsc_status IS NOT NULL THEN NOW() ELSE NULL END,
    CASE WHEN p_seoagentjs_status IS NOT NULL THEN NOW() ELSE NULL END,
    CASE WHEN p_cms_status IS NOT NULL THEN NOW() ELSE NULL END,
    CASE WHEN p_hosting_status IS NOT NULL THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_token, domain) 
  DO UPDATE SET
    gsc_status = COALESCE(p_gsc_status, website_setup_status.gsc_status),
    seoagentjs_status = COALESCE(p_seoagentjs_status, website_setup_status.seoagentjs_status),
    cms_status = COALESCE(p_cms_status, website_setup_status.cms_status),
    cms_type = COALESCE(p_cms_type, website_setup_status.cms_type),
    hosting_status = COALESCE(p_hosting_status, website_setup_status.hosting_status),
    hosting_provider = COALESCE(p_hosting_provider, website_setup_status.hosting_provider),
    gsc_last_checked = CASE WHEN p_gsc_status IS NOT NULL THEN NOW() ELSE website_setup_status.gsc_last_checked END,
    seoagentjs_last_checked = CASE WHEN p_seoagentjs_status IS NOT NULL THEN NOW() ELSE website_setup_status.seoagentjs_last_checked END,
    cms_last_checked = CASE WHEN p_cms_status IS NOT NULL THEN NOW() ELSE website_setup_status.cms_last_checked END,
    hosting_last_checked = CASE WHEN p_hosting_status IS NOT NULL THEN NOW() ELSE website_setup_status.hosting_last_checked END,
    gsc_connected_at = CASE WHEN p_gsc_status = 'connected' AND website_setup_status.gsc_status != 'connected' THEN NOW() ELSE website_setup_status.gsc_connected_at END,
    seoagentjs_last_active = CASE WHEN p_seoagentjs_status = 'active' THEN NOW() ELSE website_setup_status.seoagentjs_last_active END,
    cms_connected_at = CASE WHEN p_cms_status = 'connected' AND website_setup_status.cms_status != 'connected' THEN NOW() ELSE website_setup_status.cms_connected_at END,
    hosting_connected_at = CASE WHEN p_hosting_status = 'connected' AND website_setup_status.hosting_status != 'connected' THEN NOW() ELSE website_setup_status.hosting_connected_at END
  RETURNING *;
  
  SELECT * INTO result FROM website_setup_status 
  WHERE user_token = p_user_token AND domain = p_domain;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create API endpoint helper function
CREATE OR REPLACE FUNCTION get_website_setup_status(
  p_user_token VARCHAR(255),
  p_domain TEXT
) RETURNS JSON AS $$
DECLARE
  setup_record website_setup_status;
  result JSON;
BEGIN
  SELECT * INTO setup_record
  FROM website_setup_status
  WHERE user_token = p_user_token AND domain = p_domain;
  
  IF setup_record IS NULL THEN
    -- Return default status if no record exists
    result := json_build_object(
      'gscStatus', 'none',
      'seoagentjsStatus', 'inactive',
      'cmsStatus', 'none',
      'hostingStatus', 'none',
      'setupProgress', 0,
      'isFullySetup', false,
      'exists', false
    );
  ELSE
    result := json_build_object(
      'gscStatus', setup_record.gsc_status,
      'seoagentjsStatus', setup_record.seoagentjs_status,
      'cmsStatus', setup_record.cms_status,
      'cmsType', setup_record.cms_type,
      'hostingStatus', setup_record.hosting_status,
      'hostingProvider', setup_record.hosting_provider,
      'setupProgress', setup_record.setup_progress,
      'isFullySetup', setup_record.is_fully_setup,
      'setupCompletedAt', setup_record.setup_completed_at,
      'exists', true,
      'lastUpdated', setup_record.updated_at
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;