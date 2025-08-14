-- Phase A: One-time consolidation of business records
-- Consolidate multiple businesses per user into a single canonical business

BEGIN;

-- 1) Map each owner to a canonical business:
-- Preference: customized name first, then most recently updated, then lowest id
WITH ranked AS (
  SELECT
    bm.user_id AS owner_id,
    b.id AS business_id,
    (COALESCE(b.name_customized, false))::int AS customized_weight,
    GREATEST(COALESCE(b.updated_at, b.created_at), b.created_at) AS recency,
    ROW_NUMBER() OVER (
      PARTITION BY bm.user_id
      ORDER BY (COALESCE(b.name_customized,false)) DESC,
               GREATEST(COALESCE(b.updated_at, b.created_at), b.created_at) DESC,
               b.id ASC
    ) AS rn
  FROM businesses b
  JOIN business_members bm ON bm.business_id = b.id
  WHERE bm.role = 'owner'
),
canon AS (
  SELECT owner_id, business_id AS canonical_business_id
  FROM ranked WHERE rn = 1
),
dupes AS (
  SELECT r.owner_id, r.business_id AS duplicate_business_id, c.canonical_business_id
  FROM ranked r
  JOIN canon c USING (owner_id)
  WHERE r.rn > 1
)

-- 2) Reassign all dependent rows from duplicate businesses to the canonical business

-- Update customers
UPDATE customers t
SET business_id = d.canonical_business_id
FROM dupes d
WHERE t.business_id = d.duplicate_business_id;

-- Update jobs
UPDATE jobs t
SET business_id = d.canonical_business_id
FROM dupes d
WHERE t.business_id = d.duplicate_business_id;

-- Update quotes
UPDATE quotes t
SET business_id = d.canonical_business_id
FROM dupes d
WHERE t.business_id = d.duplicate_business_id;

-- Update invoices
UPDATE invoices t
SET business_id = d.canonical_business_id
FROM dupes d
WHERE t.business_id = d.duplicate_business_id;

-- Update audit_logs
UPDATE audit_logs t
SET business_id = d.canonical_business_id
FROM dupes d
WHERE t.business_id = d.duplicate_business_id;

-- Update invites
UPDATE invites t
SET business_id = d.canonical_business_id
FROM dupes d
WHERE t.business_id = d.duplicate_business_id;

-- 3) Reattach memberships (ALL members, not just owners) from duplicates to canonical
UPDATE business_members bm
SET business_id = d.canonical_business_id
FROM dupes d
WHERE bm.business_id = d.duplicate_business_id;

-- 4) Set each owner's default business in profiles
UPDATE profiles p
SET default_business_id = c.canonical_business_id
FROM canon c
WHERE p.id = c.owner_id;

-- 5) Now it's safe to delete the duplicate businesses (no references remain)
DELETE FROM businesses b
USING dupes d
WHERE b.id = d.duplicate_business_id;

-- Phase B: Prevent future duplicates

-- 6) Enforce "one owner membership per user"
CREATE UNIQUE INDEX IF NOT EXISTS ux_owner_one_business_per_user
  ON business_members(user_id)
  WHERE role = 'owner';

-- 7) Add performance indexes
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_business_id ON jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_quotes_business_id ON quotes(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_members_business ON business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON business_members(user_id);

-- 8) Ensure default_business_id consistency
CREATE OR REPLACE FUNCTION ensure_default_business_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.default_business_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM business_members bm
    WHERE bm.user_id = NEW.id AND bm.business_id = NEW.default_business_id
  ) THEN
    RAISE EXCEPTION 'default_business_id % has no membership for user %', NEW.default_business_id, NEW.id;
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_default_biz_check ON profiles;
CREATE TRIGGER trg_profiles_default_biz_check
BEFORE INSERT OR UPDATE OF default_business_id ON profiles
FOR EACH ROW EXECUTE FUNCTION ensure_default_business_membership();

-- 9) Update ensure_default_business function to prevent duplicates
CREATE OR REPLACE FUNCTION public.ensure_default_business()
RETURNS businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  b public.businesses%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for existing owner membership first
  SELECT b.* INTO b
  FROM public.businesses b
  JOIN public.business_members bm ON bm.business_id = b.id
  WHERE bm.user_id = auth.uid() AND bm.role = 'owner'
  ORDER BY b.created_at
  LIMIT 1;

  IF NOT FOUND THEN
    -- Create new business and membership atomically
    INSERT INTO public.businesses (name, owner_id)
    VALUES ('My Business', auth.uid())
    RETURNING * INTO b;
    
    -- Create owner membership
    INSERT INTO public.business_members (user_id, business_id, role)
    VALUES (auth.uid(), b.id, 'owner');
    
    -- Set as default business
    UPDATE public.profiles
    SET default_business_id = b.id
    WHERE id = auth.uid();
  END IF;

  RETURN b;
END;
$function$;

COMMIT;