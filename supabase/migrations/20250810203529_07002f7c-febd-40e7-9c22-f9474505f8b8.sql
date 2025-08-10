-- Safe cleanup + timestamp triggers
begin;

-- Drop redundant unique indexes that duplicate canonical constraints or preferred indexes.
-- Intentionally skipping constraint-backed names like unique_quote_number_per_business / unique_invoice_number_per_business

-- Quotes duplicates
DROP INDEX IF EXISTS public.uq_quotes_business_number;
DROP INDEX IF EXISTS public.idx_quotes_business_number_unique;
DROP INDEX IF EXISTS public.uq_quotes_public_token;

-- Invoices duplicates
DROP INDEX IF EXISTS public.uq_invoices_business_number;
DROP INDEX IF EXISTS public.idx_invoices_business_number_unique;
DROP INDEX IF EXISTS public.uq_invoices_public_token;

-- Profiles duplicates (keep profiles_email_unique_ci)
DROP INDEX IF EXISTS public.uq_profiles_lower_email;

-- Mail sends duplicates (keep uq_mail_sends_user_request and idx_mail_sends_provider_message_id)
DROP INDEX IF EXISTS public.mail_sends_user_request_hash_uidx;
DROP INDEX IF EXISTS public.mail_sends_provider_msg_idx;

commit;

-- Ensure updated_at triggers exist on core tables
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
END$$;