
-- 1) Role enum
create type public.org_role as enum ('owner', 'admin', 'member', 'viewer');

-- 2) Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.organizations enable row level security;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- 3) Organization Members
create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, profile_id)
);
alter table public.org_members enable row level security;
create index if not exists org_members_org_id_idx on public.org_members (org_id);
create index if not exists org_members_profile_id_idx on public.org_members (profile_id);

-- 4) Helper functions for RLS
create or replace function public.is_org_member(_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = _org_id
      and m.profile_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = _org_id
      and m.profile_id = auth.uid()
      and m.role in ('owner','admin')
  );
$$;

-- 5) RLS for orgs/members (future-proof for direct Supabase usage)
create policy if not exists "Members can view their organizations"
  on public.organizations
  for select
  to authenticated
  using (public.is_org_member(id));

create policy if not exists "Admins can update their organizations"
  on public.organizations
  for update
  to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

create policy if not exists "Admins can delete their organizations"
  on public.organizations
  for delete
  to authenticated
  using (public.is_org_admin(id));

create policy if not exists "Members can view org_members of their org"
  on public.org_members
  for select
  to authenticated
  using (public.is_org_member(org_id));

create policy if not exists "Admins can manage org_members"
  on public.org_members
  for all
  to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

-- 6) Customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customers enable row level security;
create index if not exists customers_org_id_idx on public.customers (org_id);
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create policy if not exists "Org members can manage customers"
  on public.customers
  for all
  to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- 7) Quotes
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  number text not null,
  status text not null default 'Draft',
  address text,
  tax_rate numeric not null default 0,
  discount integer not null default 0,
  payment_terms text,
  frequency text,
  deposit_required boolean,
  deposit_percent numeric,
  sent_at timestamptz,
  view_count integer,
  subtotal integer not null default 0,
  total integer not null default 0,
  files jsonb,
  notes_internal text,
  terms text,
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  public_token text not null default encode(gen_random_bytes(16), 'hex'),
  unique (org_id, number)
);
alter table public.quotes enable row level security;
create index if not exists quotes_org_id_idx on public.quotes (org_id);
create index if not exists quotes_customer_id_idx on public.quotes (customer_id);
create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

create policy if not exists "Org members can manage quotes"
  on public.quotes
  for all
  to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- 8) Quote line items
create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  name text not null,
  qty numeric not null default 1,
  unit text,
  unit_price integer not null default 0,
  line_total integer not null default 0
);
alter table public.quote_line_items enable row level security;
create index if not exists quote_line_items_quote_id_idx on public.quote_line_items (quote_id);

create policy if not exists "Org members can manage quote_line_items"
  on public.quote_line_items
  for all
  to authenticated
  using (public.is_org_member((select q.org_id from public.quotes q where q.id = quote_id)))
  with check (public.is_org_member((select q.org_id from public.quotes q where q.id = quote_id)));

-- 9) Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  address text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'Scheduled',
  recurrence text,
  notes text,
  total integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.jobs enable row level security;
create index if not exists jobs_org_id_idx on public.jobs (org_id);
create index if not exists jobs_customer_id_idx on public.jobs (customer_id);
create index if not exists jobs_quote_id_idx on public.jobs (quote_id);
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

create policy if not exists "Org members can manage jobs"
  on public.jobs
  for all
  to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- 10) Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  number text not null,
  tax_rate numeric not null default 0,
  discount integer not null default 0,
  subtotal integer not null default 0,
  total integer not null default 0,
  status text not null default 'Draft',
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  public_token text not null default encode(gen_random_bytes(16), 'hex'),
  unique (org_id, number)
);
alter table public.invoices enable row level security;
create index if not exists invoices_org_id_idx on public.invoices (org_id);
create index if not exists invoices_customer_id_idx on public.invoices (customer_id);
create index if not exists invoices_job_id_idx on public.invoices (job_id);
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create policy if not exists "Org members can manage invoices"
  on public.invoices
  for all
  to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- 11) Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount integer not null,
  status text not null default 'Succeeded',
  received_at timestamptz not null default now(),
  method text not null default 'Card',
  last4 text
);
alter table public.payments enable row level security;
create index if not exists payments_org_id_idx on public.payments (org_id);
create index if not exists payments_invoice_id_idx on public.payments (invoice_id);

create policy if not exists "Org members can manage payments"
  on public.payments
  for all
  to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
