
-- Clean up redundant unique indexes and duplicate non-unique indexes (idempotent)
-- We keep the canonical unique constraints (_key names) and standardized index names with _id suffix.

-- Quotes: unique (business_id, number) and public_token
DROP INDEX IF EXISTS public.uq_quotes_business_number;
DROP INDEX IF EXISTS public.idx_quotes_business_number_unique;
DROP INDEX IF EXISTS public.unique_quote_number_per_business;
DROP INDEX IF EXISTS public.uq_quotes_public_token;

-- Invoices: unique (business_id, number) and public_token
DROP INDEX IF EXISTS public.uq_invoices_business_number;
DROP INDEX IF EXISTS public.idx_invoices_business_number_unique;
DROP INDEX IF EXISTS public.unique_invoice_number_per_business;
DROP INDEX IF EXISTS public.uq_invoices_public_token;

-- Profiles: case-insensitive email unique
-- Keep: profiles_email_unique_ci
DROP INDEX IF EXISTS public.uq_profiles_lower_email;

-- Mail sends: idempotency and provider message lookup
-- Keep: uq_mail_sends_user_request and idx_mail_sends_provider_message_id
DROP INDEX IF EXISTS public.mail_sends_user_request_hash_uidx;
DROP INDEX IF EXISTS public.mail_sends_provider_msg_idx;

-- Businesses: keep _id-suffixed
DROP INDEX IF EXISTS public.idx_businesses_owner;

-- Customers: keep _id-suffixed
DROP INDEX IF EXISTS public.idx_customers_owner;
DROP INDEX IF EXISTS public.idx_customers_business;

-- Quote line items: keep _id-suffixed
DROP INDEX IF EXISTS public.idx_quote_line_items_owner;
DROP INDEX IF EXISTS public.idx_quote_line_items_quote;

-- Invoice line items: keep _id-suffixed
DROP INDEX IF EXISTS public.idx_invoice_line_items_owner;
DROP INDEX IF EXISTS public.idx_invoice_line_items_invoice;

-- Quotes: keep _id-suffixed
DROP INDEX IF EXISTS public.idx_quotes_owner;
DROP INDEX IF EXISTS public.idx_quotes_customer;
DROP INDEX IF EXISTS public.idx_quotes_business;

-- Invoices: keep _id-suffixed
DROP INDEX IF EXISTS public.idx_invoices_owner;
DROP INDEX IF EXISTS public.idx_invoices_customer;
DROP INDEX IF EXISTS public.idx_invoices_business;
DROP INDEX IF EXISTS public.idx_invoices_job;

-- Jobs: keep _id-suffixed
DROP INDEX IF EXISTS public.idx_jobs_owner;
DROP INDEX IF EXISTS public.idx_jobs_customer;
DROP INDEX IF EXISTS public.idx_jobs_business;
DROP INDEX IF EXISTS public.idx_jobs_quote;

-- Payments: keep _id-suffixed
DROP INDEX IF EXISTS public.idx_payments_owner;
DROP INDEX IF EXISTS public.idx_payments_invoice;
