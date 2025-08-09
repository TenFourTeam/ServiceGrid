
-- Create a table to store quote engagement events from email actions
create table if not exists public.quote_events (
  id uuid primary key default gen_random_uuid(),
  quote_id text not null,
  token text not null,
  type text not null, -- 'open' | 'approve' | 'edit'
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Optional indexes for performance
create index if not exists quote_events_quote_id_idx on public.quote_events (quote_id);
create index if not exists quote_events_created_at_idx on public.quote_events (created_at);

-- Enable Row Level Security
alter table public.quote_events enable row level security;

-- For now, allow public read (frontend needs to poll events to reflect status/view count)
-- Edge function will write using service role which bypasses RLS.
drop policy if exists "Public can read quote_events" on public.quote_events;
create policy "Public can read quote_events"
  on public.quote_events
  for select
  using (true);
