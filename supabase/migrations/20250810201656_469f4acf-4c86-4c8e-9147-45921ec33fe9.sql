
-- Phase 1: DB cleanup (drop duplicate constraints and redundant indexes)
-- Safe/idempotent: every drop uses IF EXISTS

-- 1) Ensure we keep the single, canonical uniqueness on (business_id, number)
-- Quotes
alter table public.quotes drop constraint if exists unique_quote_number_per_business;
drop index if exists public.idx_quotes_business_number_unique;
drop index if exists public.uq_quotes_business_number; -- just in case (variant name)
-- Drop redundant non-unique index on public_token (constraint already creates a unique index)
drop index if exists public.idx_quotes_public_token;

-- Invoices
alter table public.invoices drop constraint if exists unique_invoice_number_per_business;
drop index if exists public.idx_invoices_business_number_unique;
drop index if exists public.uq_invoices_business_number; -- just in case (variant name)
-- Drop redundant non-unique index on public_token (constraint already creates a unique index)
drop index if exists public.idx_invoices_public_token;
-- Drop extra duplicate unique index on public_token (keep invoices_public_token_key)
drop index if exists public.uq_invoices_public_token;

-- 2) Drop duplicate single-column indexes: prefer one clear name per column
-- Businesses
drop index if exists public.idx_businesses_owner_id;

-- Customers
drop index if exists public.idx_customers_owner_id;
drop index if exists public.idx_customers_business_id;

-- Quotes
drop index if exists public.idx_quotes_business_id;
drop index if exists public.idx_quotes_customer_id;
drop index if exists public.idx_quotes_owner_id;

-- Invoices
drop index if exists public.idx_invoices_business_id;
drop index if exists public.idx_invoices_customer_id;
drop index if exists public.idx_invoices_job_id;
drop index if exists public.idx_invoices_owner_id;

-- Jobs
drop index if exists public.idx_jobs_owner_id;
drop index if exists public.idx_jobs_business_id;
drop index if exists public.idx_jobs_customer_id;
drop index if exists public.idx_jobs_quote_id;

-- Quote line items
drop index if exists public.idx_quote_line_items_owner_id;
drop index if exists public.idx_quote_line_items_quote_id;

-- Invoice line items
drop index if exists public.idx_invoice_line_items_owner_id;
drop index if exists public.idx_invoice_line_items_invoice_id;

-- 3) Quote events: keep one index per column, drop duplicates
drop index if exists public.idx_quote_events_quote_id;
drop index if exists public.idx_quote_events_created_at;

-- 4) Mail sends: keep canonical idempotency and provider lookup indexes, drop duplicates
drop index if exists public.mail_sends_user_request_hash_uidx; -- duplicate of uq_mail_sends_user_request
drop index if exists public.mail_sends_provider_msg_idx;        -- duplicate of idx_mail_sends_provider_message_id
drop index if exists public.idx_mail_sends_request_hash;        -- redundant given (user_id, request_hash) unique

-- 5) Profiles: keep a single CI-unique on email and a single unique on clerk_user_id
drop index if exists public.uq_profiles_lower_email;            -- duplicate of profiles_email_unique_ci
drop index if exists public.profiles_clerk_user_id_key;         -- keep uq_profiles_clerk_user_id (partial) as canonical

-- 6) Sanity: ensure current business defaults are correct (no-op if already correct)
-- Verified via introspection: est_prefix='QUO-', inv_prefix='INV-'; no changes here.

-- Done
