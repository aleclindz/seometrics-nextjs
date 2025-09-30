-- Add sort_index column for manual ordering of article briefs

ALTER TABLE IF EXISTS public.article_briefs
  ADD COLUMN IF NOT EXISTS sort_index integer;

CREATE INDEX IF NOT EXISTS article_briefs_sort_idx ON public.article_briefs(sort_index);

