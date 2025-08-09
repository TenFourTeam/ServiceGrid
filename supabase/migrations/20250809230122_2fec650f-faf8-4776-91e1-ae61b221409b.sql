
-- 1) Ensure updated_at auto-updates on core tables

-- Helper function already exists: public.set_updated_at()

-- Customers
DROP TRIGGER IF EXISTS set_updated_at_on_customers ON public.customers;
CREATE TRIGGER set_updated_at_on_customers
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Quotes
DROP TRIGGER IF EXISTS set_updated_at_on_quotes ON public.quotes;
CREATE TRIGGER set_updated_at_on_quotes
BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Quote line items
DROP TRIGGER IF EXISTS set_updated_at_on_quote_line_items ON public.quote_line_items;
CREATE TRIGGER set_updated_at_on_quote_line_items
BEFORE UPDATE ON public.quote_line_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Invoices
DROP TRIGGER IF EXISTS set_updated_at_on_invoices ON public.invoices;
CREATE TRIGGER set_updated_at_on_invoices
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Invoice line items
DROP TRIGGER IF EXISTS set_updated_at_on_invoice_line_items ON public.invoice_line_items;
CREATE TRIGGER set_updated_at_on_invoice_line_items
BEFORE UPDATE ON public.invoice_line_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Jobs
DROP TRIGGER IF EXISTS set_updated_at_on_jobs ON public.jobs;
CREATE TRIGGER set_updated_at_on_jobs
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Payments
DROP TRIGGER IF EXISTS set_updated_at_on_payments ON public.payments;
CREATE TRIGGER set_updated_at_on_payments
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Businesses
DROP TRIGGER IF EXISTS set_updated_at_on_businesses ON public.businesses;
CREATE TRIGGER set_updated_at_on_businesses
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Profiles
DROP TRIGGER IF EXISTS set_updated_at_on_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_on_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Mail sends
DROP TRIGGER IF EXISTS set_updated_at_on_mail_sends ON public.mail_sends;
CREATE TRIGGER set_updated_at_on_mail_sends
BEFORE UPDATE ON public.mail_sends
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 2) Helpful indexes for performance

-- Common list sorts and filters
CREATE INDEX IF NOT EXISTS idx_customers_owner_updated ON public.customers (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_owner_updated    ON public.quotes (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_owner_updated      ON public.jobs (owner_id, updated_at DESC);

-- Foreign key filters
CREATE INDEX IF NOT EXISTS idx_customers_business      ON public.customers (business_id);
CREATE INDEX IF NOT EXISTS idx_quotes_business         ON public.quotes (business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business       ON public.invoices (business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_business           ON public.jobs (business_id);


-- 3) RPC: ensure_default_business() for first-time setup
-- Returns an existing business for the current user or creates one if none exists.
CREATE OR REPLACE FUNCTION public.ensure_default_business()
RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  b public.businesses%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO b
  FROM public.businesses
  WHERE owner_id = auth.uid()
  ORDER BY created_at
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.businesses (name, owner_id)
    VALUES ('My Business', auth.uid())
    RETURNING * INTO b;
  END IF;

  RETURN b;
END;
$$;
