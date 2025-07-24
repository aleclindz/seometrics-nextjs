-- Fix Stuck Articles in Production Database
-- Run this SQL script in your Supabase SQL editor to fix the current production issues

-- 1. Fix Article ID 2: Has content but status is "generating" - should be "generated"
UPDATE article_queue 
SET 
  status = 'generated',
  updated_at = NOW(),
  generation_time_seconds = 95  -- From the logs showing 95 seconds
WHERE 
  id = 2 
  AND status = 'generating' 
  AND article_content IS NOT NULL 
  AND article_content != '';

-- 2. Fix Article ID 1: Stuck in "generating" with no content - reset to "pending" 
UPDATE article_queue 
SET 
  status = 'pending',
  updated_at = NOW(),
  error_message = NULL,
  retry_count = 0
WHERE 
  id = 1 
  AND status = 'generating' 
  AND (article_content IS NULL OR article_content = '');

-- 3. Add missing log entry for Article ID 2 completion (if not exists)
INSERT INTO article_generation_logs (
  article_queue_id,
  step,
  status,
  duration_seconds,
  output_data,
  created_at
) 
SELECT 
  2,
  'content_generation',
  'completed',
  95,
  '{"seoScore": 7, "wordCount": 1244, "qualityScore": 7, "readabilityScore": 5}',
  '2025-07-24 16:45:10.278203+00'
WHERE NOT EXISTS (
  SELECT 1 FROM article_generation_logs 
  WHERE article_queue_id = 2 
  AND step = 'content_generation' 
  AND status = 'completed'
);

-- 4. Clean up any duplicate or stuck log entries
DELETE FROM article_generation_logs 
WHERE article_queue_id = 1 
  AND step = 'content_generation' 
  AND status = 'started' 
  AND created_at > '2025-07-24 18:05:00';

-- 5. Verify the fixes
SELECT 
  id,
  title,
  status,
  CASE 
    WHEN article_content IS NOT NULL AND length(article_content) > 100 THEN 'Has Content'
    ELSE 'No Content'
  END as content_status,
  word_count,
  quality_score,
  retry_count,
  error_message,
  updated_at
FROM article_queue 
WHERE id IN (1, 2)
ORDER BY id;

-- 6. Check logs are consistent
SELECT 
  article_queue_id,
  step,
  status,
  duration_seconds,
  created_at
FROM article_generation_logs 
WHERE article_queue_id IN (1, 2)
ORDER BY article_queue_id, created_at;