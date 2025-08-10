-- Normalization migration: ensure updated_at triggers and proper unique constraints

-- 1) Canonical helper to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2) Create BEFORE UPDATE triggers for all tables with updated_at
-- Utility DO block pattern to create trigger only if missing

-- businesses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_set_updated_at_businesses' AND c.relname = 'businesses'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_businesses
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_set_updated_at_customers' AND c.relname = 'customers'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_customers
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_set_updated_at_quotes' AND c.relname = 'quotes'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_quotes
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- quote_line_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_set_updated_at_quote_line_items' AND c.relname = 'quote_line_items'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_quote_line_items
    BEFORE UPDATE ON public.quote_line_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_set_updated_at_jobs' AND c.relname = 'jobs'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_jobs
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_set_updated_at_invoices' AND c.relname = 'invoices'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_invoices
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- invoice_line_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_set_updated_at_invoice_line_items' AND c.relname = 'invoice_line_items'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_invoice_line_items
    BEFORE UPDATE ON public.invoice_line_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_set_updated_at_payments' AND c.relname = 'payments'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_payments
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- mail_sends
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_set_updated_at_mail_sends' AND c.relname = 'mail_sends'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_mail_sends
    BEFORE UPDATE ON public.mail_sends
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_set_updated_at_profiles' AND c.relname = 'profiles'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 3) Constraints: ensure numbering uniqueness per business, drop legacy owner-based unique constraints if present
-- Drop any legacy owner-based unique constraints if they exist
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_owner_id_number_key;
ALTER TABLE public.quotes   DROP CONSTRAINT IF EXISTS quotes_owner_id_number_key;

-- Ensure unique (business_id, number) for invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_business_id_number_key'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_business_id_number_key UNIQUE (business_id, number);
  END IF;
END$$;

-- Ensure unique (business_id, number) for quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotes_business_id_number_key'
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_business_id_number_key UNIQUE (business_id, number);
  END IF;
END$$;