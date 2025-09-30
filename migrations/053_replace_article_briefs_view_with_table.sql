-- Replace an existing view named article_briefs with a real table we can insert into.
-- Safe to run multiple times.

DO $$
BEGIN
  -- If a view named article_briefs exists, rename it to keep legacy compatibility
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'article_briefs'
  ) THEN
    EXECUTE 'ALTER VIEW public.article_briefs RENAME TO article_briefs_view_legacy';
  END IF;
END $$;

-- Create the table if it doesn't exist
create table if not exists public.article_briefs (
  id bigserial primary key,
  user_token text not null,
  website_token text not null,
  title text not null,
  h1 text,
  url_path text,
  page_type text check (page_type in ('pillar','cluster','supporting')) default 'cluster',
  parent_cluster text,
  primary_keyword text not null,
  intent text check (intent in ('informational','commercial','transactional','comparison','pricing','location','mixed')) not null,
  secondary_keywords jsonb default '[]'::jsonb,
  target_queries jsonb default '[]'::jsonb,
  summary text,
  internal_links jsonb default '{}'::jsonb,
  cannibal_risk text check (cannibal_risk in ('none','possible','high')) default 'none',
  cannibal_conflicts jsonb default '[]'::jsonb,
  recommendation text,
  canonical_to text,
  word_count_min int,
  word_count_max int,
  tone text default 'professional',
  notes jsonb default '[]'::jsonb,
  status text check (status in ('draft','queued','generated','published','archived')) default 'draft',
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists article_briefs_user_site_idx on public.article_briefs(user_token, website_token);
create index if not exists article_briefs_status_idx on public.article_briefs(status);
create index if not exists article_briefs_cluster_idx on public.article_briefs(parent_cluster);

