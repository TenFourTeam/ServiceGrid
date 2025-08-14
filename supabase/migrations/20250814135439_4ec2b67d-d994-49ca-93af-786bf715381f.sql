-- Add business name intent tracking and sane defaults
BEGIN;

-- Ensure default and not-null on businesses.name
ALTER TABLE public.businesses
  ALTER COLUMN name SET DEFAULT 'My Business',
  ALTER COLUMN name SET NOT NULL;

-- Track intent
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS name_customized boolean NOT NULL DEFAULT false;

-- Normalize and set flag on insert/update
CREATE OR REPLACE FUNCTION public.normalize_business_name()
RETURNS TRIGGER AS $$
BEGIN
  -- default if missing/empty
  IF NEW.name IS NULL OR BTRIM(NEW.name) = '' THEN
    NEW.name := 'My Business';
  END IF;

  -- flag customized iff not the default (case-insensitive)
  IF LOWER(NEW.name) = 'my business' THEN
    NEW.name_customized := false;
  ELSE
    NEW.name_customized := true;
  END IF;

  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_name_norm ON public.businesses;
CREATE TRIGGER trg_business_name_norm
BEFORE INSERT OR UPDATE OF name ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.normalize_business_name();

-- One-time backfill for existing rows
UPDATE public.businesses
SET name = 'My Business'
WHERE COALESCE(BTRIM(name),'') = '';

UPDATE public.businesses
SET name_customized = (LOWER(name) <> 'my business');

COMMIT;