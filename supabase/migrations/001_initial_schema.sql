-- Initial database schema migration
-- Recreates the PHP MySQL database structure in PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (migrated from login_users)
CREATE TABLE login_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    plan INTEGER DEFAULT 0, -- 0: free, 1: paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Websites table
CREATE TABLE websites (
    id SERIAL PRIMARY KEY,
    website_token VARCHAR(255) UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    language VARCHAR(50) DEFAULT 'english',
    enable_meta_tags BOOLEAN DEFAULT true,
    enable_image_tags BOOLEAN DEFAULT true,
    meta_tags INTEGER DEFAULT 0,
    image_tags INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pages table (for meta tag processing)
CREATE TABLE pages (
    id SERIAL PRIMARY KEY,
    website_token VARCHAR(255) REFERENCES websites(website_token) ON DELETE CASCADE,
    url TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Images table (for alt-text processing)
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    website_token VARCHAR(255) REFERENCES websites(website_token) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_tag TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Articles table (for generated content)
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    language VARCHAR(50) DEFAULT 'english',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE api_usage (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    count INTEGER DEFAULT 1,
    date DATE DEFAULT CURRENT_DATE
);

-- Indexes for performance
CREATE INDEX idx_websites_user_token ON websites(user_token);
CREATE INDEX idx_pages_website_token ON pages(website_token);
CREATE INDEX idx_pages_processed ON pages(processed);
CREATE INDEX idx_images_website_token ON images(website_token);
CREATE INDEX idx_images_processed ON images(processed);
CREATE INDEX idx_articles_user_token ON articles(user_token);
CREATE INDEX idx_api_usage_user_token ON api_usage(user_token);
CREATE INDEX idx_api_usage_date ON api_usage(date);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_login_users_updated_at BEFORE UPDATE ON login_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON websites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();