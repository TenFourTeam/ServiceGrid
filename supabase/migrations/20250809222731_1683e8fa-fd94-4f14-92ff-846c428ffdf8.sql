-- Re-run migration with guards (no IF NOT EXISTS on ADD CONSTRAINT)

-- 1) Unique constraints for numbering per business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'unique_quote_number_per_business'
      AND n.nspname = 'public'
      AND t.relname = 'quotes'
  ) THEN
    ALTER TABLE public.quotes
    ADD CONSTRAINT unique_quote_number_per_business
    UNIQUE (business_id, number);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'unique_invoice_number_per_business'
      AND n.nspname = 'public'
      AND t.relname = 'invoices'
  ) THEN
    ALTER TABLE public.invoices
    ADD CONSTRAINT unique_invoice_number_per_business
    UNIQUE (business_id, number);
  END IF;
END $$;

-- 2) Atomic helpers for next numbers
CREATE OR REPLACE FUNCTION public.next_est_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_seq integer;
  v_number text;
BEGIN
  -- Increment atomically and fetch new values
  UPDATE businesses b
  SET est_seq = b.est_seq + 1
  WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  RETURNING b.est_prefix, b.est_seq INTO v_prefix, v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Business not found or not owned by current user';
  END IF;

  v_number := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_inv_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_seq integer;
  v_number text;
BEGIN
  UPDATE businesses b
  SET inv_seq = b.inv_seq + 1
  WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  RETURNING b.inv_prefix, b.inv_seq INTO v_prefix, v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Business not found or not owned by current user';
  END IF;

  v_number := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_number;
END;
$$;

-- 3) Ensure updated_at triggers are applied
DO $$
BEGIN
  -- businesses
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_businesses'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_businesses
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- customers
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_customers'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_customers
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- quotes
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_quotes'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_quotes
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- quote_line_items
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_quote_line_items'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_quote_line_items
    BEFORE UPDATE ON public.quote_line_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- jobs
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_jobs'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_jobs
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- invoices
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_invoices'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_invoices
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- invoice_line_items
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_invoice_line_items'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_invoice_line_items
    BEFORE UPDATE ON public.invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  -- payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_payments'
  ) THEN
    CREATE TRIGGER trg_set_updated_at_payments
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;