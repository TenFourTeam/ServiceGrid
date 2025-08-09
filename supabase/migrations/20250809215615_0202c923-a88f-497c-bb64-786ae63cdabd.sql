
-- 1) Enum types (idempotent creation)
do $$
begin
  perform 1 from pg_type where typname = 'quote_status';
  if not found then
    create type public.quote_status as enum ('Draft', 'Sent', 'Viewed', 'Approved', 'Declined', 'Edits Requested');
  end if;
end$$;

do $$
begin
  perform 1 from pg_type where typname = 'invoice_status';
  if not found then
    create type public.invoice_status as enum ('Draft', 'Sent', 'Paid', 'Overdue');
  end if;
end$$;

do $$
begin
  perform 1 from pg_type where typname = 'job_status';
  if not found then
    create type public.job_status as enum ('Scheduled', 'In Progress', 'Completed');
  end if;
end$$;

do $$
begin
  perform 1 from pg_type where typname = 'payment_status';
  if not found then
    create type public.payment_status as enum ('Succeeded', 'Failed');
  end if;
end$$;

do $$
begin
  perform 1 from pg_type where typname = 'payment_terms';
  if not found then
    create type public.payment_terms as enum ('due_on_receipt','net_15','net_30','net_60');
  end if;
end$$;

do $$
begin
  perform 1 from pg_type where typname = 'quote_frequency';
  if not found then
    create type public.quote_frequency as enum ('one-off','bi-monthly','monthly','bi-yearly','yearly');
  end if;
end$$;

-- 2) Core tables

-- businesses
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null, -- references public.profiles(id) (omitted FK to avoid constraint issues if profiles.id is not unique)
  name text not null,
  logo_url text,
  phone text,
  reply_to_email text,
  tax_rate_default numeric(6,4) not null default 0.0,
  est_prefix text not null default 'EST-',
  est_seq integer not null default 1,
  inv_prefix text not null default 'INV-',
  inv_seq integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- quotes
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  number text not null,
  address text,
  tax_rate numeric(6,4) not null default 0.0,
  discount integer not null default 0, -- cents
  payment_terms public.payment_terms,
  frequency public.quote_frequency,
  deposit_required boolean not null default false,
  deposit_percent smallint, -- 0..100 (validated in app)
  sent_at timestamptz,
  view_count integer not null default 0,
  files jsonb not null default '[]'::jsonb,
  notes_internal text,
  terms text,
  subtotal integer not null default 0, -- cents
  total integer not null default 0,    -- cents
  status public.quote_status not null default 'Draft',
  approved_at timestamptz,
  approved_by text,
  public_token text not null default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, number),
  unique (public_token)
);

-- quote_line_items
create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  name text not null,
  qty numeric(12,3) not null default 1,
  unit text,
  unit_price integer not null, -- cents
  line_total integer not null, -- cents
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  business_id uuid not null references public.businesses(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  address text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.job_status not null default 'Scheduled',
  recurrence text, -- e.g., 'biweekly'
  notes text,
  total integer, -- cents (optional)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  number text not null,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  tax_rate numeric(6,4) not null default 0.0,
  discount integer not null default 0, -- cents
  subtotal integer not null default 0, -- cents
  total integer not null default 0,    -- cents
  status public.invoice_status not null default 'Draft',
  due_at timestamptz,
  paid_at timestamptz,
  public_token text not null default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, number),
  unique (public_token)
);

-- invoice_line_items
create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  name text not null,
  qty numeric(12,3) not null default 1,
  unit text,
  unit_price integer not null, -- cents
  line_total integer not null, -- cents
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount integer not null, -- cents
  status public.payment_status not null,
  received_at timestamptz not null,
  method text not null default 'Card',
  last4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) RLS and policies

alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.jobs enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.payments enable row level security;

-- Helper owner policy template: owner_id = auth.uid()

-- businesses policies
drop policy if exists "Owner can read businesses" on public.businesses;
create policy "Owner can read businesses" on public.businesses
  for select using (auth.uid() = owner_id);

drop policy if exists "Owner can insert businesses" on public.businesses;
create policy "Owner can insert businesses" on public.businesses
  for insert with check (auth.uid() = owner_id);

drop policy if exists "Owner can update businesses" on public.businesses;
create policy "Owner can update businesses" on public.businesses
  for update using (auth.uid() = owner_id);

drop policy if exists "Owner can delete businesses" on public.businesses;
create policy "Owner can delete businesses" on public.businesses
  for delete using (auth.uid() = owner_id);

-- customers policies (ensure business belongs to owner on insert)
drop policy if exists "Owner can read customers" on public.customers;
create policy "Owner can read customers" on public.customers
  for select using (auth.uid() = owner_id);

drop policy if exists "Owner can insert customers" on public.customers;
create policy "Owner can insert customers" on public.customers
  for insert with check (
    auth.uid() = owner_id
    and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists "Owner can update customers" on public.customers;
create policy "Owner can update customers" on public.customers
  for update using (auth.uid() = owner_id);

drop policy if exists "Owner can delete customers" on public.customers;
create policy "Owner can delete customers" on public.customers
  for delete using (auth.uid() = owner_id);

-- quotes policies (ensure customer + business belong to owner on insert)
drop policy if exists "Owner can read quotes" on public.quotes;
create policy "Owner can read quotes" on public.quotes
  for select using (auth.uid() = owner_id);

drop policy if exists "Owner can insert quotes" on public.quotes;
create policy "Owner can insert quotes" on public.quotes
  for insert with check (
    auth.uid() = owner_id
    and exists (select 1 from public.customers c where c.id = customer_id and c.owner_id = auth.uid())
    and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

drop policy if exists "Owner can update quotes" on public.quotes;
create policy "Owner can update quotes" on public.quotes
  for update using (auth.uid() = owner_id);

drop policy if exists "Owner can delete quotes" on public.quotes;
create policy "Owner can delete quotes" on public.quotes
  for delete using (auth.uid() = owner_id);

-- quote_line_items policies (ensure parent quote belongs to owner on insert)
drop policy if exists "Owner can read quote_line_items" on public.quote_line_items;
create policy "Owner can read quote_line_items" on public.quote_line_items
  for select using (auth.uid() = owner_id);

drop policy if exists "Owner can insert quote_line_items" on public.quote_line_items;
create policy "Owner can insert quote_line_items" on public.quote_line_items
  for insert with check (
    auth.uid() = owner_id
    and exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = auth.uid())
  );

drop policy if exists "Owner can update quote_line_items" on public.quote_line_items;
create policy "Owner can update quote_line_items" on public.quote_line_items
  for update using (auth.uid() = owner_id);

drop policy if exists "Owner can delete quote_line_items" on public.quote_line_items;
create policy "Owner can delete quote_line_items" on public.quote_line_items
  for delete using (auth.uid() = owner_id);

-- jobs policies (ensure customer + business (and optional quote) belong to owner on insert)
drop policy if exists "Owner can read jobs" on public.jobs;
create policy "Owner can read jobs" on public.jobs
  for select using (auth.uid() = owner_id);

drop policy if exists "Owner can insert jobs" on public.jobs;
create policy "Owner can insert jobs" on public.jobs
  for insert with check (
    auth.uid() = owner_id
    and exists (select 1 from public.customers c where c.id = customer_id and c.owner_id = auth.uid())
    and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
    and (quote_id is null or exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = auth.uid()))
  );

drop policy if exists "Owner can update jobs" on public.jobs;
create policy "Owner can update jobs" on public.jobs
  for update using (auth.uid() = owner_id);

drop policy if exists "Owner can delete jobs" on public.jobs;
create policy "Owner can delete jobs" on public.jobs
  for delete using (auth.uid() = owner_id);

-- invoices policies (ensure customer + business (and optional job) belong to owner on insert)
drop policy if exists "Owner can read invoices" on public.invoices;
create policy "Owner can read invoices" on public.invoices
  for select using (auth.uid() = owner_id);

drop policy if exists "Owner can insert invoices" on public.invoices;
create policy "Owner can insert invoices" on public.invoices
  for insert with check (
    auth.uid() = owner_id
    and exists (select 1 from public.customers c where c.id = customer_id and c.owner_id = auth.uid())
    and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
    and (job_id is null or exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = auth.uid()))
  );

drop policy if exists "Owner can update invoices" on public.invoices;
create policy "Owner can update invoices" on public.invoices
  for update using (auth.uid() = owner_id);

drop policy if exists "Owner can delete invoices" on public.invoices;
create policy "Owner can delete invoices" on public.invoices
  for delete using (auth.uid() = owner_id);

-- invoice_line_items policies (ensure parent invoice belongs to owner on insert)
drop policy if exists "Owner can read invoice_line_items" on public.invoice_line_items;
create policy "Owner can read invoice_line_items" on public.invoice_line_items
  for select using (auth.uid() = owner_id);

drop policy if exists "Owner can insert invoice_line_items" on public.invoice_line_items;
create policy "Owner can insert invoice_line_items" on public.invoice_line_items
  for insert with check (
    auth.uid() = owner_id
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.owner_id = auth.uid())
  );

drop policy if exists "Owner can update invoice_line_items" on public.invoice_line_items;
create policy "Owner can update invoice_line_items" on public.invoice_line_items
  for update using (auth.uid() = owner_id);

drop policy if exists "Owner can delete invoice_line_items" on public.invoice_line_items;
create policy "Owner can delete invoice_line_items" on public.invoice_line_items
  for delete using (auth.uid() = owner_id);

-- payments policies (ensure parent invoice belongs to owner on insert)
drop policy if exists "Owner can read payments" on public.payments;
create policy "Owner can read payments" on public.payments
  for select using (auth.uid() = owner_id);

drop policy if exists "Owner can insert payments" on public.payments;
create policy "Owner can insert payments" on public.payments
  for insert with check (
    auth.uid() = owner_id
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.owner_id = auth.uid())
  );

drop policy if exists "Owner can update payments" on public.payments;
create policy "Owner can update payments" on public.payments
  for update using (auth.uid() = owner_id);

drop policy if exists "Owner can delete payments" on public.payments;
create policy "Owner can delete payments" on public.payments
  for delete using (auth.uid() = owner_id);

-- 4) updated_at triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists trg_set_updated_at_businesses on public.businesses;
create trigger trg_set_updated_at_businesses before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_customers on public.customers;
create trigger trg_set_updated_at_customers before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_quotes on public.quotes;
create trigger trg_set_updated_at_quotes before update on public.quotes
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_quote_line_items on public.quote_line_items;
create trigger trg_set_updated_at_quote_line_items before update on public.quote_line_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_jobs on public.jobs;
create trigger trg_set_updated_at_jobs before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_invoices on public.invoices;
create trigger trg_set_updated_at_invoices before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_invoice_line_items on public.invoice_line_items;
create trigger trg_set_updated_at_invoice_line_items before update on public.invoice_line_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_payments on public.payments;
create trigger trg_set_updated_at_payments before update on public.payments
for each row execute function public.set_updated_at();

-- 5) Indexes

-- businesses
create index if not exists idx_businesses_owner on public.businesses(owner_id);

-- customers
create index if not exists idx_customers_owner on public.customers(owner_id);
create index if not exists idx_customers_business on public.customers(business_id);

-- quotes
create index if not exists idx_quotes_owner on public.quotes(owner_id);
create index if not exists idx_quotes_customer on public.quotes(customer_id);
create index if not exists idx_quotes_status on public.quotes(status);
create index if not exists idx_quotes_created_at on public.quotes(created_at);
create index if not exists idx_quotes_public_token on public.quotes(public_token);

-- quote_line_items
create index if not exists idx_quote_line_items_owner on public.quote_line_items(owner_id);
create index if not exists idx_quote_line_items_quote on public.quote_line_items(quote_id);

-- jobs
create index if not exists idx_jobs_owner on public.jobs(owner_id);
create index if not exists idx_jobs_customer on public.jobs(customer_id);
create index if not exists idx_jobs_quote on public.jobs(quote_id);
create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_jobs_starts_at on public.jobs(starts_at);

-- invoices
create index if not exists idx_invoices_owner on public.invoices(owner_id);
create index if not exists idx_invoices_customer on public.invoices(customer_id);
create index if not exists idx_invoices_job on public.invoices(job_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_created_at on public.invoices(created_at);
create index if not exists idx_invoices_public_token on public.invoices(public_token);

-- invoice_line_items
create index if not exists idx_invoice_line_items_owner on public.invoice_line_items(owner_id);
create index if not exists idx_invoice_line_items_invoice on public.invoice_line_items(invoice_id);

-- payments
create index if not exists idx_payments_owner on public.payments(owner_id);
create index if not exists idx_payments_invoice on public.payments(invoice_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_received_at on public.payments(received_at);
