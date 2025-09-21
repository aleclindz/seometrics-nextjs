-- Enhanced Content Queue Schema
-- Adds missing fields for comprehensive queue management

-- Add missing columns to content_generation_queue
ALTER TABLE content_generation_queue
ADD COLUMN IF NOT EXISTS topic_cluster VARCHAR(255),
ADD COLUMN IF NOT EXISTS content_pillar VARCHAR(255),
ADD COLUMN IF NOT EXISTS target_keywords JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS article_format JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS authority_level VARCHAR(50) DEFAULT 'foundation' CHECK (authority_level IN ('foundation', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS estimated_traffic_potential INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_queries JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS content_brief TEXT,
ADD COLUMN IF NOT EXISTS queue_position INTEGER DEFAULT 0;

-- Update status enum to include draft
ALTER TABLE content_generation_queue
DROP CONSTRAINT IF EXISTS content_generation_queue_status_check,
ADD CONSTRAINT content_generation_queue_status_check
CHECK (status IN ('draft', 'pending', 'processing', 'generating', 'completed', 'failed', 'cancelled'));

-- Add index for efficient queue ordering
CREATE INDEX IF NOT EXISTS idx_content_queue_position ON content_generation_queue(user_token, website_token, queue_position, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_generation_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_queue_priority ON content_generation_queue(user_token, website_token, priority DESC, scheduled_for);

-- Create a function to automatically update queue positions
CREATE OR REPLACE FUNCTION update_queue_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- Update queue positions based on scheduled_for order
    WITH numbered_queue AS (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY user_token, website_token
            ORDER BY scheduled_for ASC
        ) as new_position
        FROM content_generation_queue
        WHERE user_token = COALESCE(NEW.user_token, OLD.user_token)
        AND website_token = COALESCE(NEW.website_token, OLD.website_token)
        AND status IN ('draft', 'pending', 'generating')
    )
    UPDATE content_generation_queue
    SET queue_position = numbered_queue.new_position
    FROM numbered_queue
    WHERE content_generation_queue.id = numbered_queue.id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically maintain queue positions
DROP TRIGGER IF EXISTS trigger_update_queue_positions ON content_generation_queue;
CREATE TRIGGER trigger_update_queue_positions
    AFTER INSERT OR UPDATE OR DELETE ON content_generation_queue
    FOR EACH ROW EXECUTE FUNCTION update_queue_positions();

-- Create a view for easy queue management
CREATE OR REPLACE VIEW content_queue_view AS
SELECT
    q.*,
    w.domain,
    w.cleaned_domain,
    s.frequency,
    s.content_style as schedule_content_style,
    ROW_NUMBER() OVER (
        PARTITION BY q.user_token, q.website_token
        ORDER BY q.priority ASC, q.scheduled_for ASC
    ) as current_position
FROM content_generation_queue q
LEFT JOIN websites w ON q.website_token = w.website_token
LEFT JOIN content_schedules s ON q.schedule_id = s.id
WHERE q.status IN ('draft', 'pending', 'generating')
ORDER BY q.user_token, q.website_token, q.priority, q.scheduled_for;

-- Add RLS policies for the new columns
CREATE POLICY "Users can manage their own content queue"
ON content_generation_queue
FOR ALL
USING (user_token = current_setting('app.user_token', true));

-- Grant permissions
GRANT ALL ON content_generation_queue TO authenticated;
GRANT SELECT ON content_queue_view TO authenticated;

-- Sample data structure for article_format JSONB
-- {
--   "type": "listicle|how-to|guide|faq|comparison|update|case-study|beginner-guide",
--   "template": "Template description",
--   "wordCountRange": [1500, 2500]
-- }

-- Sample data structure for target_keywords JSONB
-- ["primary keyword", "secondary keyword", "long tail keyword"]

-- Sample data structure for target_queries JSONB
-- ["how to do X", "what is Y", "best Z for beginners"]

COMMENT ON TABLE content_generation_queue IS 'Enhanced content generation queue with comprehensive topic and format management';
COMMENT ON COLUMN content_generation_queue.topic_cluster IS 'Topic cluster this article belongs to for authority building';
COMMENT ON COLUMN content_generation_queue.content_pillar IS 'Main content pillar/theme this article supports';
COMMENT ON COLUMN content_generation_queue.target_keywords IS 'JSON array of target keywords for SEO optimization';
COMMENT ON COLUMN content_generation_queue.short_description IS 'Brief description of the article content';
COMMENT ON COLUMN content_generation_queue.article_format IS 'JSON object defining article format and structure';
COMMENT ON COLUMN content_generation_queue.authority_level IS 'Authority level for strategic content progression';
COMMENT ON COLUMN content_generation_queue.priority IS 'Priority order within the queue (1 = highest)';
COMMENT ON COLUMN content_generation_queue.estimated_traffic_potential IS 'Estimated monthly traffic potential from GSC analysis';
COMMENT ON COLUMN content_generation_queue.target_queries IS 'JSON array of specific search queries to target';
COMMENT ON COLUMN content_generation_queue.content_brief IS 'Detailed content brief and requirements';
COMMENT ON COLUMN content_generation_queue.queue_position IS 'Auto-calculated position in the queue based on priority and schedule';