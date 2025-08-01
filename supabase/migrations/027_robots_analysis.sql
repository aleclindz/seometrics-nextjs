-- Create robots_analyses table for storing robots.txt analysis results
create table public.robots_analyses (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    user_token text not null,
    site_url text not null,
    exists boolean not null default false,
    accessible boolean not null default false,
    size integer not null default 0,
    content text default '',
    issues jsonb default '[]'::jsonb,
    suggestions jsonb default '[]'::jsonb,
    crawl_delay integer,
    sitemap_urls jsonb default '[]'::jsonb,
    user_agents jsonb default '[]'::jsonb,
    allowed_paths jsonb default '[]'::jsonb,
    disallowed_paths jsonb default '[]'::jsonb,
    analyzed_at timestamp with time zone default now(),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create unique constraint on user_token and site_url
alter table public.robots_analyses
add constraint robots_analyses_user_site_unique unique (user_token, site_url);

-- Create indexes for performance
create index robots_analyses_user_id_idx on public.robots_analyses (user_id);
create index robots_analyses_site_url_idx on public.robots_analyses (site_url);
create index robots_analyses_analyzed_at_idx on public.robots_analyses (analyzed_at desc);

-- Enable RLS
alter table public.robots_analyses enable row level security;

-- Create RLS policies
create policy "Users can view their own robots analyses"
    on public.robots_analyses for select
    using (auth.uid() = user_id);

create policy "Users can insert their own robots analyses"
    on public.robots_analyses for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own robots analyses"
    on public.robots_analyses for update
    using (auth.uid() = user_id);

create policy "Users can delete their own robots analyses"
    on public.robots_analyses for delete
    using (auth.uid() = user_id);

-- Create function to automatically update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger handle_robots_analyses_updated_at
    before update on public.robots_analyses
    for each row
    execute function public.handle_updated_at();

-- Add comment to table
comment on table public.robots_analyses is 'Stores robots.txt analysis results for technical SEO monitoring';