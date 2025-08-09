
-- 1) Create profiles table with timestamps
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Enable RLS
alter table public.profiles enable row level security;

-- 3) Backfill from auth.users, deduplicating on lower(email) (keep earliest)
with candidates as (
  select
    u.id,
    u.email,
    u.created_at,
    row_number() over (partition by lower(u.email) order by u.created_at asc) as rn
  from auth.users u
  where u.email is not null
)
insert into public.profiles (id, email)
select id, email
from candidates
where rn = 1
on conflict (id) do nothing;

-- 4) Enforce case-insensitive uniqueness for emails
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'profiles_email_unique_ci'
  ) then
    create unique index profiles_email_unique_ci on public.profiles (lower(email));
  end if;
end
$$;

-- 5) Keep updated_at in sync on updates (uses existing helper function)
drop trigger if exists set_timestamp on public.profiles;
create trigger set_timestamp
before update on public.profiles
for each row
execute function public.set_updated_at();

-- 6) RLS policies: users can view and update their own profile
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
