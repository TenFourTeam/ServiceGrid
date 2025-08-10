
-- Phase 2: Add canonical uniques and ensure updated_at triggers exist (idempotent)

-- 1) Canonical unique indexes (idempotent)

-- Quotes: unique (business_id, number)
CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_business_number
  ON public.quotes (business_id, number);

-- Quotes: unique public_token
CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_public_token
  ON public.quotes (public_token);

-- Invoices: unique (business_id, number)
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_business_number
  ON public.invoices (business_id, number);

-- Invoices: unique public_token
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_public_token
  ON public.invoices (public_token);

-- Profiles: case-insensitive unique on email
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_ci
  ON public.profiles (lower(email));

-- Profiles: unique clerk_user_id when present
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_clerk_user_id
  ON public.profiles (clerk_user_id)
  WHERE clerk_user_id IS NOT NULL;

-- Mail sends: idempotency key per user (user_id, request_hash)
CREATE UNIQUE INDEX IF NOT EXISTS uq_mail_sends_user_request
  ON public.mail_sends (user_id, request_hash);

-- Mail sends: provider message id lookup (non-unique)
CREATE INDEX IF NOT EXISTS idx_mail_sends_provider_message_id
  ON public.mail_sends (provider_message_id);


-- 2) Ensure updated_at triggers exist on all tables with updated_at column

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_businesses') THEN
    CREATE TRIGGER set_updated_at_businesses
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_customers') THEN
    CREATE TRIGGER set_updated_at_customers
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_quotes') THEN
    CREATE TRIGGER set_updated_at_quotes
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_quote_line_items') THEN
    CREATE TRIGGER set_updated_at_quote_line_items
    BEFORE UPDATE ON public.quote_line_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_invoices') THEN
    CREATE TRIGGER set_updated_at_invoices
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_invoice_line_items') THEN
    CREATE TRIGGER set_updated_at_invoice_line_items
    BEFORE UPDATE ON public.invoice_line_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_jobs') THEN
    CREATE TRIGGER set_updated_at_jobs
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_payments') THEN
    CREATE TRIGGER set_updated_at_payments
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_mail_sends') THEN
    CREATE TRIGGER set_updated_at_mail_sends
    BEFORE UPDATE ON public.mail_sends
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_profiles') THEN
    CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;
