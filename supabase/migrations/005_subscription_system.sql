-- Subscription system database schema
-- Adds user_plans and usage_tracking tables for subscription management

-- User plans table for subscription tiers
CREATE TABLE user_plans (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL DEFAULT 'starter', -- 'starter', 'pro', 'enterprise'
    sites_allowed INTEGER NOT NULL DEFAULT 2,
    posts_allowed INTEGER NOT NULL DEFAULT 4,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token)
);

-- Usage tracking table for quota management
CREATE TABLE usage_tracking (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    site_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'article', 'site'
    month_year VARCHAR(7) NOT NULL, -- '2025-01' format
    count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token, site_id, resource_type, month_year)
);

-- Indexes for performance
CREATE INDEX idx_user_plans_user_token ON user_plans(user_token);
CREATE INDEX idx_user_plans_status ON user_plans(status);
CREATE INDEX idx_user_plans_stripe_customer ON user_plans(stripe_customer_id);
CREATE INDEX idx_usage_tracking_user_token ON usage_tracking(user_token);
CREATE INDEX idx_usage_tracking_month_year ON usage_tracking(month_year);
CREATE INDEX idx_usage_tracking_resource_type ON usage_tracking(resource_type);

-- Updated_at trigger for user_plans
CREATE TRIGGER update_user_plans_updated_at 
    BEFORE UPDATE ON user_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for usage_tracking  
CREATE TRIGGER update_usage_tracking_updated_at 
    BEFORE UPDATE ON usage_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update articles table to include new fields
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES websites(id),
ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS cms_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS eeat_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS metrics_json JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS readability_score DECIMAL(3,1);

-- Create article versions table
CREATE TABLE IF NOT EXISTS article_versions (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(article_id, version_number)
);

-- Create index for article versions
CREATE INDEX IF NOT EXISTS idx_article_versions_article_id ON article_versions(article_id);

-- Insert default plan for existing users
INSERT INTO user_plans (user_token, tier, sites_allowed, posts_allowed, status)
SELECT token, 'starter', 2, 4, 'active'
FROM login_users
WHERE token NOT IN (SELECT user_token FROM user_plans);

-- Create subscription tier constants view
CREATE OR REPLACE VIEW subscription_tiers AS
SELECT 
    'starter' as tier,
    49 as monthly_price,
    2 as sites_allowed,
    4 as posts_allowed,
    'Starter Plan' as display_name
UNION ALL
SELECT 
    'pro' as tier,
    139 as monthly_price,
    5 as sites_allowed,
    10 as posts_allowed,
    'Pro Plan' as display_name
UNION ALL
SELECT 
    'enterprise' as tier,
    NULL as monthly_price,
    -1 as sites_allowed, -- -1 indicates unlimited
    -1 as posts_allowed, -- -1 indicates unlimited
    'Enterprise Plan' as display_name;