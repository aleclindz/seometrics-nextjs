-- Migration: Add granular article status values for better workflow separation
-- Created: 2024-07-24
-- Purpose: Convert VARCHAR status to ENUM and add granular failure states

-- Step 1: Create the article_status enum type with existing values
CREATE TYPE article_status AS ENUM (
  'pending',
  'generating', 
  'generated',
  'publishing',
  'published',
  'failed'
);

-- Step 2: Add new granular status values
ALTER TYPE article_status ADD VALUE 'generation_failed';
ALTER TYPE article_status ADD VALUE 'publishing_failed';

-- Step 3: Add new column with enum type
ALTER TABLE article_queue ADD COLUMN status_new article_status;

-- Step 4: Migrate existing data from VARCHAR to enum
UPDATE article_queue SET status_new = status::article_status;

-- Step 5: Update failed articles to use granular statuses based on content presence
UPDATE article_queue 
SET status_new = CASE 
  WHEN status_new = 'failed' AND article_content IS NOT NULL THEN 'publishing_failed'::article_status
  WHEN status_new = 'failed' AND article_content IS NULL THEN 'generation_failed'::article_status
  ELSE status_new
END
WHERE status_new = 'failed';

-- Step 6: Drop old VARCHAR column and rename new enum column
ALTER TABLE article_queue DROP COLUMN status;
ALTER TABLE article_queue RENAME COLUMN status_new TO status;

-- Step 7: Add NOT NULL constraint and default value
ALTER TABLE article_queue ALTER COLUMN status SET NOT NULL;
ALTER TABLE article_queue ALTER COLUMN status SET DEFAULT 'pending';

-- Step 8: Add function to validate status transitions
CREATE OR REPLACE FUNCTION validate_article_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow all transitions from pending
  IF OLD.status = 'pending' THEN
    RETURN NEW;
  END IF;
  
  -- Allow transitions from generating to generated or generation_failed
  IF OLD.status = 'generating' AND NEW.status NOT IN ('generated', 'generation_failed') THEN
    RAISE EXCEPTION 'Invalid status transition from generating to %', NEW.status;
  END IF;
  
  -- Allow transitions from generated to publishing or publishing_failed
  IF OLD.status = 'generated' AND NEW.status NOT IN ('publishing', 'publishing_failed') THEN
    RAISE EXCEPTION 'Invalid status transition from generated to %', NEW.status;
  END IF;
  
  -- Allow transitions from publishing to published or publishing_failed
  IF OLD.status = 'publishing' AND NEW.status NOT IN ('published', 'publishing_failed') THEN
    RAISE EXCEPTION 'Invalid status transition from publishing to %', NEW.status;
  END IF;
  
  -- Allow retries: generation_failed -> generating, publishing_failed -> publishing
  IF OLD.status = 'generation_failed' AND NEW.status NOT IN ('generating') THEN
    RAISE EXCEPTION 'Invalid status transition from generation_failed to %', NEW.status;
  END IF;
  
  IF OLD.status = 'publishing_failed' AND NEW.status NOT IN ('publishing') THEN
    RAISE EXCEPTION 'Invalid status transition from publishing_failed to %', NEW.status;
  END IF;
  
  -- Final states (published) cannot be changed
  IF OLD.status = 'published' THEN
    RAISE EXCEPTION 'Cannot change status from published state';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger to enforce status transitions
DROP TRIGGER IF EXISTS article_status_transition_trigger ON article_queue;
CREATE TRIGGER article_status_transition_trigger
  BEFORE UPDATE OF status ON article_queue
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_article_status_transition();

-- Step 10: Add documentation comments
COMMENT ON TYPE article_status IS 'Article workflow statuses: pending -> generating -> generated -> publishing -> published, with generation_failed and publishing_failed for error states';
COMMENT ON TABLE article_queue IS 'Queue for AI-generated articles with granular status tracking for generation and publishing phases';