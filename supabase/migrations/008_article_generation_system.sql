-- Article Generation System Database Schema
-- This migration creates tables for Strapi integration, website analysis, and article publishing queue

-- CMS connections table for managing Strapi and other CMS integrations
CREATE TABLE cms_connections (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    cms_type VARCHAR(50) NOT NULL DEFAULT 'strapi',
    connection_name VARCHAR(255) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    api_token TEXT, -- Encrypted API token
    content_type VARCHAR(100) DEFAULT 'api::article::article',
    auth_config JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, error
    last_sync_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token, website_id, connection_name)
);

-- Website content analysis and topic discovery
CREATE TABLE website_analysis (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    content_topics JSONB DEFAULT '[]', -- ["SEO", "Content Marketing", "Web Development"]
    target_keywords JSONB DEFAULT '[]', -- [{"keyword": "SEO tips", "volume": 1000, "difficulty": 45}]
    secondary_keywords JSONB DEFAULT '[]',
    competitor_urls JSONB DEFAULT '[]', -- [{"url": "example.com", "relevance": 0.8}]
    brand_voice JSONB DEFAULT '{}', -- {"tone": "professional", "style": "educational"}
    content_gaps JSONB DEFAULT '[]', -- Topics competitors cover but user doesn't
    sitemap_urls JSONB DEFAULT '[]', -- All discovered URLs from sitemap
    analysis_status VARCHAR(50) DEFAULT 'pending', -- pending, analyzing, completed, failed
    last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(website_id)
);

-- Article generation and publishing queue
CREATE TABLE article_queue (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    cms_connection_id INTEGER REFERENCES cms_connections(id) ON DELETE SET NULL,
    title VARCHAR(500),
    slug VARCHAR(255),
    target_keywords JSONB DEFAULT '[]', -- Primary keywords to target
    secondary_keywords JSONB DEFAULT '[]', -- Secondary keywords to include
    content_outline JSONB DEFAULT '{}', -- Generated outline structure
    article_content TEXT, -- Generated article content
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    featured_image_url VARCHAR(500),
    internal_links JSONB DEFAULT '[]', -- Links to other articles
    status VARCHAR(50) DEFAULT 'pending', -- pending, generating, generated, publishing, published, failed
    scheduled_for TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    cms_article_id VARCHAR(255), -- ID in the CMS after publishing
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    generation_time_seconds INTEGER,
    quality_score DECIMAL(3,1), -- Overall quality score 0-10
    word_count INTEGER,
    readability_score DECIMAL(3,1),
    seo_score DECIMAL(3,1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated article images (for DALL-E integration)
CREATE TABLE article_images (
    id SERIAL PRIMARY KEY,
    article_queue_id INTEGER NOT NULL REFERENCES article_queue(id) ON DELETE CASCADE,
    image_type VARCHAR(50) NOT NULL, -- featured, inline, thumbnail
    image_url VARCHAR(500),
    alt_text VARCHAR(255),
    caption TEXT,
    prompt_used TEXT, -- DALL-E prompt that generated this image
    position_in_article INTEGER, -- For inline images
    cms_image_id VARCHAR(255), -- ID in CMS media library
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article generation logs for debugging and monitoring
CREATE TABLE article_generation_logs (
    id SERIAL PRIMARY KEY,
    article_queue_id INTEGER NOT NULL REFERENCES article_queue(id) ON DELETE CASCADE,
    step VARCHAR(100) NOT NULL, -- outline_generation, content_generation, image_generation, publishing
    status VARCHAR(50) NOT NULL, -- started, completed, failed
    duration_seconds INTEGER,
    input_data JSONB,
    output_data JSONB,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content templates and prompts for consistent article generation
CREATE TABLE content_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(100) NOT NULL, -- article_outline, introduction, conclusion, cta
    industry VARCHAR(100), -- technology, marketing, health, finance, etc.
    content_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Template variables like {keyword}, {brand_name}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_name, template_type, industry)
);

-- Indexes for performance
CREATE INDEX idx_cms_connections_user_website ON cms_connections(user_token, website_id);
CREATE INDEX idx_cms_connections_status ON cms_connections(status);
CREATE INDEX idx_website_analysis_website_id ON website_analysis(website_id);
CREATE INDEX idx_website_analysis_status ON website_analysis(analysis_status);
CREATE INDEX idx_article_queue_user_token ON article_queue(user_token);
CREATE INDEX idx_article_queue_website_id ON article_queue(website_id);
CREATE INDEX idx_article_queue_status ON article_queue(status);
CREATE INDEX idx_article_queue_scheduled ON article_queue(scheduled_for);
CREATE INDEX idx_article_queue_created ON article_queue(created_at);
CREATE INDEX idx_article_images_queue_id ON article_images(article_queue_id);
CREATE INDEX idx_generation_logs_queue_id ON article_generation_logs(article_queue_id);
CREATE INDEX idx_content_templates_type ON content_templates(template_type, industry);

-- Updated_at triggers
CREATE TRIGGER update_cms_connections_updated_at 
    BEFORE UPDATE ON cms_connections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_queue_updated_at 
    BEFORE UPDATE ON article_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default content templates
INSERT INTO content_templates (template_name, template_type, industry, content_template, variables) VALUES
('Tech Blog Outline', 'article_outline', 'technology', 
 '## Introduction\n- Hook: {hook_statement}\n- Problem: {problem_statement}\n- Solution preview: {solution_preview}\n\n## Main Content\n### {keyword} Fundamentals\n### Best Practices for {keyword}\n### Common Mistakes to Avoid\n### Advanced {keyword} Techniques\n\n## Conclusion\n- Summary of key points\n- Call to action: {cta}', 
 '["hook_statement", "problem_statement", "solution_preview", "keyword", "cta"]'),

('Marketing Blog Outline', 'article_outline', 'marketing',
 '## Introduction\n- Industry trend: {trend_statement}\n- Challenge: {challenge_statement}\n- Article purpose: {purpose_statement}\n\n## Main Content\n### Understanding {keyword}\n### {keyword} Strategies That Work\n### Case Studies and Examples\n### Implementation Guide\n### Measuring Success\n\n## Conclusion\n- Key takeaways\n- Next steps: {next_steps}',
 '["trend_statement", "challenge_statement", "purpose_statement", "keyword", "next_steps"]'),

('Professional Introduction', 'introduction', 'general',
 'In today''s competitive digital landscape, {keyword} has become more important than ever. {hook_statement}\n\nWhether you''re {target_audience}, understanding {keyword} can significantly impact {benefit_statement}. This comprehensive guide will walk you through {article_scope}, providing you with actionable insights and proven strategies.\n\n{preview_statement}',
 '["keyword", "hook_statement", "target_audience", "benefit_statement", "article_scope", "preview_statement"]'),

('Call to Action', 'cta', 'general',
 '## Ready to {action_verb} Your {keyword} Strategy?\n\n{summary_statement}\n\nIf you''re looking to {goal_statement}, we''re here to help. {company_name} specializes in {service_description}.\n\n**Get started today:**\n- {cta_option_1}\n- {cta_option_2}\n- {cta_option_3}\n\n[Contact us]({contact_url}) to learn how we can help you achieve your {keyword} goals.',
 '["action_verb", "keyword", "summary_statement", "goal_statement", "company_name", "service_description", "cta_option_1", "cta_option_2", "cta_option_3", "contact_url"]');

-- Grant necessary permissions to authenticated users and service role
GRANT SELECT ON cms_connections TO authenticated;
GRANT SELECT ON website_analysis TO authenticated;
GRANT SELECT ON article_queue TO authenticated;
GRANT SELECT ON article_images TO authenticated;
GRANT SELECT ON content_templates TO authenticated;

-- Service role gets full access
GRANT ALL ON cms_connections TO service_role;
GRANT ALL ON website_analysis TO service_role;
GRANT ALL ON article_queue TO service_role;
GRANT ALL ON article_images TO service_role;
GRANT ALL ON article_generation_logs TO service_role;
GRANT ALL ON content_templates TO service_role;