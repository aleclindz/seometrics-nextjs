-- Create activity_summaries table for caching AI-generated activity summaries
create table public.activity_summaries (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.login_users(id) on delete cascade not null,
    user_token text not null,
    site_url text not null,
    summary_text text not null,
    activity_period_start timestamp with time zone not null,
    activity_period_end timestamp with time zone not null,
    activity_hash text not null, -- Hash of included activity data to detect changes
    activity_count integer not null default 0, -- Number of activities included in summary
    generated_at timestamp with time zone default now(),
    expires_at timestamp with time zone default (now() + interval '7 days'),
    last_user_visit timestamp with time zone, -- Track when user last saw this summary
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create unique constraint on user_token and site_url (one active summary per site)
alter table public.activity_summaries
add constraint activity_summaries_user_site_unique unique (user_token, site_url);

-- Create indexes for performance
create index activity_summaries_user_id_idx on public.activity_summaries (user_id);
create index activity_summaries_user_token_idx on public.activity_summaries (user_token);
create index activity_summaries_site_url_idx on public.activity_summaries (site_url);
create index activity_summaries_generated_at_idx on public.activity_summaries (generated_at desc);
create index activity_summaries_expires_at_idx on public.activity_summaries (expires_at);
create btree index activity_summaries_activity_hash_idx on public.activity_summaries (activity_hash);

-- Enable RLS
alter table public.activity_summaries enable row level security;

-- Create RLS policies
create policy "Users can view their own activity summaries"
    on public.activity_summaries for select
    using (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

create policy "Users can insert their own activity summaries"
    on public.activity_summaries for insert
    with check (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

create policy "Users can update their own activity summaries"
    on public.activity_summaries for update
    using (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

create policy "Users can delete their own activity summaries"
    on public.activity_summaries for delete
    using (
        user_token IN (
            SELECT token FROM login_users WHERE auth_user_id = auth.uid()
        )
    );

-- Create function to automatically update updated_at
create or replace function public.handle_activity_summaries_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger handle_activity_summaries_updated_at
    before update on public.activity_summaries
    for each row
    execute function public.handle_activity_summaries_updated_at();

-- Create function to clean up expired summaries
create or replace function public.cleanup_expired_activity_summaries()
returns void as $$
begin
    delete from public.activity_summaries 
    where expires_at < now();
end;
$$ language plpgsql;

-- Add comment to table
comment on table public.activity_summaries is 'Stores AI-generated summaries of recent SEO activity for user-friendly status updates';
comment on column public.activity_summaries.activity_hash is 'Hash of activity data used to detect when regeneration is needed';
comment on column public.activity_summaries.activity_count is 'Number of activities included to help determine significance';
comment on column public.activity_summaries.last_user_visit is 'Tracks when user last saw summary for cadence control';