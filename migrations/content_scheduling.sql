-- Migration: Content Scheduling Configuration
-- Purpose: Add automated blog post scheduling functionality to websites

-- Content scheduling configuration table
CREATE TABLE IF NOT EXISTS content_schedules (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    website_token VARCHAR(255) REFERENCES websites(website_token) ON DELETE CASCADE,

    -- Scheduling configuration
    enabled BOOLEAN DEFAULT false,
    frequency VARCHAR(50) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    daily_count INTEGER DEFAULT 1 CHECK (daily_count >= 1 AND daily_count <= 10),
    weekly_count INTEGER DEFAULT 3 CHECK (weekly_count >= 1 AND weekly_count <= 7),
    monthly_count INTEGER DEFAULT 10 CHECK (monthly_count >= 1 AND monthly_count <= 31),

    -- Time preferences
    timezone VARCHAR(100) DEFAULT 'UTC',
    preferred_hours INTEGER[] DEFAULT '{9,12,15}', -- Array of hours (0-23)

    -- Content preferences
    content_style VARCHAR(50) DEFAULT 'professional' CHECK (content_style IN ('professional', 'casual', 'technical', 'creative')),
    target_word_count INTEGER DEFAULT 1200 CHECK (target_word_count >= 500 AND target_word_count <= 5000),
    include_images BOOLEAN DEFAULT true,
    auto_publish BOOLEAN DEFAULT false, -- false = draft, true = auto-publish

    -- Topic configuration
    topic_sources JSONB DEFAULT '[]', -- Array of topic sources/keywords
    avoid_topics JSONB DEFAULT '[]', -- Array of topics to avoid
    content_pillars JSONB DEFAULT '[]', -- Array of main content themes

    -- Metadata
    last_generated_at TIMESTAMP WITH TIME ZONE,
    next_scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: one schedule per website
    UNIQUE(website_token)
);

-- Content generation queue for tracking scheduled posts
CREATE TABLE IF NOT EXISTS content_generation_queue (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    website_token VARCHAR(255) REFERENCES websites(website_token) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES content_schedules(id) ON DELETE CASCADE,

    -- Queue metadata
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

    -- Generation parameters
    topic TEXT,
    content_type VARCHAR(50) DEFAULT 'blog_post',
    target_word_count INTEGER,
    content_style VARCHAR(50),

    -- Results
    article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
    error_message TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on both tables
ALTER TABLE content_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_generation_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_schedules
CREATE POLICY "Users can view their own content schedules" ON content_schedules
    FOR SELECT USING (user_token = current_setting('request.jwt.claim.token', true));

CREATE POLICY "Users can insert their own content schedules" ON content_schedules
    FOR INSERT WITH CHECK (user_token = current_setting('request.jwt.claim.token', true));

CREATE POLICY "Users can update their own content schedules" ON content_schedules
    FOR UPDATE USING (user_token = current_setting('request.jwt.claim.token', true));

CREATE POLICY "Users can delete their own content schedules" ON content_schedules
    FOR DELETE USING (user_token = current_setting('request.jwt.claim.token', true));

-- RLS policies for content_generation_queue
CREATE POLICY "Users can view their own content generation queue" ON content_generation_queue
    FOR SELECT USING (user_token = current_setting('request.jwt.claim.token', true));

CREATE POLICY "Users can insert their own content generation queue items" ON content_generation_queue
    FOR INSERT WITH CHECK (user_token = current_setting('request.jwt.claim.token', true));

CREATE POLICY "Users can update their own content generation queue items" ON content_generation_queue
    FOR UPDATE USING (user_token = current_setting('request.jwt.claim.token', true));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_schedules_user_token ON content_schedules(user_token);
CREATE INDEX IF NOT EXISTS idx_content_schedules_website_token ON content_schedules(website_token);
CREATE INDEX IF NOT EXISTS idx_content_schedules_enabled ON content_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_content_schedules_next_scheduled ON content_schedules(next_scheduled_at);

CREATE INDEX IF NOT EXISTS idx_content_generation_queue_user_token ON content_generation_queue(user_token);
CREATE INDEX IF NOT EXISTS idx_content_generation_queue_website_token ON content_generation_queue(website_token);
CREATE INDEX IF NOT EXISTS idx_content_generation_queue_status ON content_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_content_generation_queue_scheduled_for ON content_generation_queue(scheduled_for);

-- Function to update next_scheduled_at based on frequency
CREATE OR REPLACE FUNCTION update_next_scheduled_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate next scheduled time based on frequency
    CASE NEW.frequency
        WHEN 'daily' THEN
            NEW.next_scheduled_at := NOW() + INTERVAL '1 day';
        WHEN 'weekly' THEN
            NEW.next_scheduled_at := NOW() + INTERVAL '1 week';
        WHEN 'monthly' THEN
            NEW.next_scheduled_at := NOW() + INTERVAL '1 month';
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update next_scheduled_at
CREATE TRIGGER trigger_update_next_scheduled_at
    BEFORE INSERT OR UPDATE ON content_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_next_scheduled_at();

-- Function to calculate optimal posting times
CREATE OR REPLACE FUNCTION calculate_next_post_time(
    p_website_token VARCHAR(255),
    p_timezone VARCHAR(100) DEFAULT 'UTC',
    p_preferred_hours INTEGER[] DEFAULT '{9,12,15}'
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    base_time TIMESTAMP WITH TIME ZONE;
    target_hour INTEGER;
    result_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the current time in the specified timezone
    base_time := NOW() AT TIME ZONE p_timezone;

    -- Select a random hour from preferred hours
    target_hour := p_preferred_hours[1 + (EXTRACT(epoch FROM NOW())::INTEGER % array_length(p_preferred_hours, 1))];

    -- Set the target time to tomorrow at the selected hour
    result_time := date_trunc('day', base_time) + INTERVAL '1 day' + (target_hour || ' hours')::INTERVAL;

    -- Convert back to UTC
    RETURN result_time AT TIME ZONE p_timezone;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE content_schedules IS 'Configuration for automated blog post scheduling per website';
COMMENT ON TABLE content_generation_queue IS 'Queue for tracking scheduled content generation tasks';
COMMENT ON FUNCTION calculate_next_post_time IS 'Calculates the next optimal posting time based on preferences';