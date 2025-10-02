-- Link briefs to generated drafts and vice versa

ALTER TABLE IF EXISTS public.article_briefs
  ADD COLUMN IF NOT EXISTS generated_article_id bigint; -- references article_queue.id

ALTER TABLE IF EXISTS public.article_queue
  ADD COLUMN IF NOT EXISTS generated_from_brief_id bigint; -- references article_briefs.id

CREATE INDEX IF NOT EXISTS idx_article_briefs_generated_article_id ON public.article_briefs(generated_article_id);
CREATE INDEX IF NOT EXISTS idx_article_queue_generated_from_brief_id ON public.article_queue(generated_from_brief_id);

