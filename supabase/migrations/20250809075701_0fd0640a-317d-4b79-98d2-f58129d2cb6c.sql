-- Create table for idempotent outbox records
create table if not exists public.mail_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  quote_id text,
  request_hash text not null,
  nylas_grant_id text,
  to_email text not null,
  subject text not null,
  status text not null default 'pending',
  provider_message_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure unique idempotency per user
create unique index if not exists mail_sends_user_request_hash_uidx
  on public.mail_sends (user_id, request_hash);

-- Helpful lookup index
create index if not exists mail_sends_provider_msg_idx
  on public.mail_sends (provider_message_id);

-- Enable RLS
alter table public.mail_sends enable row level security;

-- Policies: owner-only access
create policy "Mail sends are viewable by owner"
  on public.mail_sends for select
  using (auth.uid() = user_id);

create policy "Owner can insert their own mail sends"
  on public.mail_sends for insert
  with check (auth.uid() = user_id);

create policy "Owner can update their own mail sends"
  on public.mail_sends for update
  using (auth.uid() = user_id);

-- Trigger to maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_mail_sends_updated_at
before update on public.mail_sends
for each row execute function public.set_updated_at();