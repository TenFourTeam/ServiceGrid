
-- Phase 5: DB hardening and baseline
-- Safe: no table shape changes; adds indexes and updated_at triggers only.

-- 1) Unique numbering per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_business_number_unique
  ON public.invoices (business_id, number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_business_number_unique
  ON public.quotes (business_id, number);

-- 2) Performance indexes

-- businesses
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses (owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_updated_at ON public.businesses (updated_at);

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON public.customers (owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers (business_id);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON public.customers (updated_at);

-- quotes
CREATE INDEX IF NOT EXISTS idx_quotes_owner_id ON public.quotes (owner_id);
CREATE INDEX IF NOT EXISTS idx_quotes_business_id ON public.quotes (business_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_updated_at ON public.quotes (updated_at);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes (status);
CREATE INDEX IF NOT EXISTS idx_quotes_sent_at ON public.quotes (sent_at);

-- quote_line_items
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_id ON public.quote_line_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_owner_id ON public.quote_line_items (owner_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_position ON public.quote_line_items (position);

-- jobs
CREATE INDEX IF NOT EXISTS idx_jobs_owner_id ON public.jobs (owner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_business_id ON public.jobs (business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs (customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_quote_id ON public.jobs (quote_id);
CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON public.jobs (updated_at);
CREATE INDEX IF NOT EXISTS idx_jobs_starts_at ON public.jobs (starts_at);
CREATE INDEX IF NOT EXISTS idx_jobs_ends_at ON public.jobs (ends_at);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_owner_id ON public.invoices (owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices (business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON public.invoices (job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_updated_at ON public.invoices (updated_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);

-- invoice_line_items
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON public.invoice_line_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_owner_id ON public.invoice_line_items (owner_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_position ON public.invoice_line_items (position);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_owner_id ON public.payments (owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_received_at ON public.payments (received_at);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles (updated_at);

-- mail_sends
CREATE INDEX IF NOT EXISTS idx_mail_sends_user_id ON public.mail_sends (user_id);
CREATE INDEX IF NOT EXISTS idx_mail_sends_created_at ON public.mail_sends (created_at);
CREATE INDEX IF NOT EXISTS idx_mail_sends_request_hash ON public.mail_sends (request_hash);

-- quote_events
CREATE INDEX IF NOT EXISTS idx_quote_events_quote_id ON public.quote_events (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_events_token ON public.quote_events (token);
CREATE INDEX IF NOT EXISTS idx_quote_events_created_at ON public.quote_events (created_at);

-- 3) updated_at triggers (idempotent creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_businesses_set_updated_at') THEN
    CREATE TRIGGER trg_businesses_set_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customers_set_updated_at') THEN
    CREATE TRIGGER trg_customers_set_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_quotes_set_updated_at') THEN
    CREATE TRIGGER trg_quotes_set_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_quote_line_items_set_updated_at') THEN
    CREATE TRIGGER trg_quote_line_items_set_updated_at
    BEFORE UPDATE ON public.quote_line_items
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_jobs_set_updated_at') THEN
    CREATE TRIGGER trg_jobs_set_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invoices_set_updated_at') THEN
    CREATE TRIGGER trg_invoices_set_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invoice_line_items_set_updated_at') THEN
    CREATE TRIGGER trg_invoice_line_items_set_updated_at
    BEFORE UPDATE ON public.invoice_line_items
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payments_set_updated_at') THEN
    CREATE TRIGGER trg_payments_set_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_set_updated_at') THEN
    CREATE TRIGGER trg_profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mail_sends_set_updated_at') THEN
    CREATE TRIGGER trg_mail_sends_set_updated_at
    BEFORE UPDATE ON public.mail_sends
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END
$$;
