-- Onboarding Survey System
-- This migration creates the infrastructure for collecting user onboarding survey data

-- Create enum types for standardized responses
CREATE TYPE website_building_method AS ENUM (
    'custom', 
    'shopify', 
    'wix', 
    'squarespace', 
    'wordpress', 
    'webflow',
    'lovable',
    'replit',
    'github_pages',
    'other'
);

CREATE TYPE cms_type AS ENUM (
    'none',
    'strapi',
    'contentful', 
    'sanity',
    'ghost',
    'wordpress',
    'directus',
    'other'
);

CREATE TYPE hosting_provider AS ENUM (
    'vercel',
    'netlify', 
    'aws',
    'google_cloud',
    'github_pages',
    'cloudflare_pages',
    'digitalocean',
    'heroku',
    'railway',
    'render',
    'other'
);

-- Onboarding survey responses table
CREATE TABLE onboarding_surveys (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Core website building questions
    website_building_method website_building_method NOT NULL,
    website_building_method_other TEXT, -- When "other" is selected
    
    -- CMS questions (contextual based on building method)
    uses_cms BOOLEAN DEFAULT false,
    cms_type cms_type DEFAULT 'none',
    cms_type_other TEXT, -- When "other" is selected
    
    -- Hosting questions
    hosting_provider hosting_provider NOT NULL,
    hosting_provider_other TEXT, -- When "other" is selected
    
    -- Business context
    business_type VARCHAR(100), -- e.g., "e-commerce", "blog", "portfolio", "saas"
    website_age VARCHAR(50), -- e.g., "less than 1 month", "1-6 months", "6+ months"
    monthly_visitors VARCHAR(50), -- e.g., "< 1k", "1k-10k", "10k+"
    
    -- SEO experience and goals
    seo_experience VARCHAR(50), -- e.g., "beginner", "intermediate", "advanced"
    primary_seo_goal TEXT, -- Free text for their main SEO objective
    
    -- Founder call and premium offer
    interested_in_founder_call BOOLEAN DEFAULT false,
    calendly_booking_link TEXT, -- If they book a call
    accepted_pro_offer BOOLEAN DEFAULT false, -- 3 months free Pro
    pro_offer_redemption_code VARCHAR(100), -- Unique code for redemption
    
    -- Survey completion tracking
    survey_completed BOOLEAN DEFAULT false,
    survey_step INTEGER DEFAULT 1, -- Track progress if they don't complete in one session
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_onboarding_surveys_user_token ON onboarding_surveys(user_token);
CREATE INDEX idx_onboarding_surveys_completed ON onboarding_surveys(survey_completed);
CREATE INDEX idx_onboarding_surveys_founder_call ON onboarding_surveys(interested_in_founder_call);
CREATE INDEX idx_onboarding_surveys_building_method ON onboarding_surveys(website_building_method);
CREATE INDEX idx_onboarding_surveys_cms_type ON onboarding_surveys(cms_type);
CREATE INDEX idx_onboarding_surveys_hosting ON onboarding_surveys(hosting_provider);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON onboarding_surveys
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS
ALTER TABLE onboarding_surveys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own survey data" ON onboarding_surveys
    FOR SELECT USING (user_token = current_setting('app.current_user_token', true));

CREATE POLICY "Users can insert their own survey data" ON onboarding_surveys
    FOR INSERT WITH CHECK (user_token = current_setting('app.current_user_token', true));

CREATE POLICY "Users can update their own survey data" ON onboarding_surveys
    FOR UPDATE USING (user_token = current_setting('app.current_user_token', true));

-- Admin policy for analytics and support
CREATE POLICY "Admin can view all surveys" ON onboarding_surveys
    FOR SELECT USING (current_setting('role', true) = 'admin');

-- Survey analytics view for demand analysis
CREATE VIEW onboarding_survey_analytics AS
SELECT 
    website_building_method,
    cms_type,
    hosting_provider,
    business_type,
    seo_experience,
    COUNT(*) as response_count,
    COUNT(*) FILTER (WHERE survey_completed = true) as completed_count,
    COUNT(*) FILTER (WHERE interested_in_founder_call = true) as founder_call_interest,
    COUNT(*) FILTER (WHERE accepted_pro_offer = true) as pro_offer_acceptance,
    ROUND(
        COUNT(*) FILTER (WHERE survey_completed = true)::numeric / 
        COUNT(*)::numeric * 100, 2
    ) as completion_rate
FROM onboarding_surveys
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY website_building_method, cms_type, hosting_provider, business_type, seo_experience
ORDER BY response_count DESC;

-- Survey completion funnel analysis
CREATE VIEW survey_completion_funnel AS
SELECT 
    survey_step,
    COUNT(*) as users_at_step,
    COUNT(*) FILTER (WHERE survey_completed = true) as completed_from_step,
    ROUND(
        COUNT(*) FILTER (WHERE survey_completed = true)::numeric / 
        COUNT(*)::numeric * 100, 2
    ) as completion_rate_from_step
FROM onboarding_surveys
GROUP BY survey_step
ORDER BY survey_step;