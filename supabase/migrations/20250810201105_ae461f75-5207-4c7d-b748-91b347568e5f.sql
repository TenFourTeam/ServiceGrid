-- Consolidated baseline: ensure updated_at triggers and key unique indexes
-- Functions
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at on tables that have updated_at columns
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_on_businesses') THEN
  CREATE TRIGGER set_updated_at_on_businesses
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_on_customers') THEN
  CREATE TRIGGER set_updated_at_on_customers
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_on_quotes') THEN
  CREATE TRIGGER set_updated_at_on_quotes
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_on_quote_line_items') THEN
  CREATE TRIGGER set_updated_at_on_quote_line_items
  BEFORE UPDATE ON public.quote_line_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_on_jobs') THEN
  CREATE TRIGGER set_updated_at_on_jobs
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_on_invoices') THEN
  CREATE TRIGGER set_updated_at_on_invoices
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_on_invoice_line_items') THEN
  CREATE TRIGGER set_updated_at_on_invoice_line_items
  BEFORE UPDATE ON public.invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_on_payments') THEN
  CREATE TRIGGER set_updated_at_on_payments
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_on_profiles') THEN
  CREATE TRIGGER set_updated_at_on_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_on_mail_sends') THEN
  CREATE TRIGGER set_updated_at_on_mail_sends
  BEFORE UPDATE ON public.mail_sends
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END IF;
END $$;

-- Unique indexes for numbering and tokens
CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_business_number ON public.quotes (business_id, number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_public_token ON public.quotes (public_token);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_business_number ON public.invoices (business_id, number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_public_token ON public.invoices (public_token);

-- Profiles unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_lower_email ON public.profiles ((lower(email)));
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_clerk_user_id ON public.profiles (clerk_user_id) WHERE clerk_user_id IS NOT NULL;

-- Mail sends helpful indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_mail_sends_user_request ON public.mail_sends (user_id, request_hash);
CREATE INDEX IF NOT EXISTS idx_mail_sends_provider_message_id ON public.mail_sends (provider_message_id);

-- Helpful lookup indexes (owner-scoped)
CREATE INDEX IF NOT EXISTS idx_quotes_owner ON public.quotes (owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_owner ON public.invoices (owner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_owner ON public.jobs (owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_owner ON public.customers (owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner ON public.payments (owner_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_owner ON public.invoice_line_items (owner_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_owner ON public.quote_line_items (owner_id);

-- Status indexes for common filters
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes (status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);
