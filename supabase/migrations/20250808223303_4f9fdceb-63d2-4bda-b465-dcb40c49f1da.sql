
-- 1) Table for per-user email sender configuration (SendGrid Single Sender)
create table if not exists public.email_senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'sendgrid',
  from_email text not null,
  from_name text,
  reply_to text,
  sendgrid_sender_id bigint,
  verified boolean not null default false,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique: one sender config per user for now
create unique index if not exists email_senders_user_id_key on public.email_senders (user_id);

-- Helpful indexes
create index if not exists email_senders_from_email_idx on public.email_senders (from_email);
create index if not exists email_senders_provider_idx on public.email_senders (provider);

-- Row Level Security
alter table public.email_senders enable row level security;

-- Policies: users can only access their own row
create policy "Users can view their own sender"
on public.email_senders
for select
using (auth.uid() = user_id);

create policy "Users can insert their own sender"
on public.email_senders
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own sender"
on public.email_senders
for update
using (auth.uid() = user_id);

create policy "Users can delete their own sender"
on public.email_senders
for delete
using (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_email_senders_updated_at on public.email_senders;

create trigger trg_email_senders_updated_at
before update on public.email_senders
for each row
execute function public.set_updated_at();
