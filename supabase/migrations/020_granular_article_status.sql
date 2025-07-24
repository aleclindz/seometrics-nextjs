-- Migration: Add granular article status values for better workflow separation
-- Created: 2024-07-24
-- Purpose: Replace single 'failed' status with 'generation_failed' and 'publishing_failed'

-- Add new status values to the existing enum
ALTER TYPE article_status ADD VALUE 'generation_failed';
ALTER TYPE article_status ADD VALUE 'publishing_failed';

-- Update existing failed articles to use granular statuses based on content presence
UPDATE article_queue 
SET status = CASE 
  WHEN status = 'failed' AND article_content IS NOT NULL THEN 'publishing_failed'::article_status
  WHEN status = 'failed' AND article_content IS NULL THEN 'generation_failed'::article_status
  ELSE status
END
WHERE status = 'failed';

-- Add a function to validate status transitions
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

-- Create trigger to enforce status transitions
DROP TRIGGER IF EXISTS article_status_transition_trigger ON article_queue;
CREATE TRIGGER article_status_transition_trigger
  BEFORE UPDATE OF status ON article_queue
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_article_status_transition();

-- Add comment documenting the status flow
COMMENT ON TYPE article_status IS 'Article workflow statuses: pending -> generating -> generated -> publishing -> published, with generation_failed and publishing_failed for error states';

-- Update the table comment to reflect new workflow
COMMENT ON TABLE article_queue IS 'Queue for AI-generated articles with granular status tracking for generation and publishing phases';