-- Add 'generating' status to article_briefs status constraint
-- This allows briefs to show a persistent "generating article" state while articles are being created

DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'article_briefs_status_check'
    AND table_name = 'article_briefs'
  ) THEN
    ALTER TABLE public.article_briefs DROP CONSTRAINT article_briefs_status_check;
  END IF;

  -- Add updated constraint with 'generating' status
  ALTER TABLE public.article_briefs
    ADD CONSTRAINT article_briefs_status_check
    CHECK (status IN ('draft','queued','generating','generated','published','archived'));
END $$;
