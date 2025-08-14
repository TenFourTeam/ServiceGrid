-- Phase A: One-time consolidation of business records
-- Consolidate multiple businesses per user into a single canonical business

-- First, let's create a temporary table to store the consolidation mapping
CREATE TEMP TABLE consolidation_mapping AS
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
)
SELECT 
  r.owner_id, 
  r.business_id AS duplicate_business_id, 
  c.canonical_business_id,
  CASE WHEN r.rn = 1 THEN true ELSE false END AS is_canonical
FROM ranked r
JOIN canon c USING (owner_id);

-- Update customers
UPDATE customers 
SET business_id = cm.canonical_business_id
FROM consolidation_mapping cm
WHERE customers.business_id = cm.duplicate_business_id 
  AND cm.is_canonical = false;

-- Update jobs
UPDATE jobs 
SET business_id = cm.canonical_business_id
FROM consolidation_mapping cm
WHERE jobs.business_id = cm.duplicate_business_id 
  AND cm.is_canonical = false;

-- Update quotes
UPDATE quotes 
SET business_id = cm.canonical_business_id
FROM consolidation_mapping cm
WHERE quotes.business_id = cm.duplicate_business_id 
  AND cm.is_canonical = false;

-- Update invoices
UPDATE invoices 
SET business_id = cm.canonical_business_id
FROM consolidation_mapping cm
WHERE invoices.business_id = cm.duplicate_business_id 
  AND cm.is_canonical = false;

-- Update audit_logs
UPDATE audit_logs 
SET business_id = cm.canonical_business_id
FROM consolidation_mapping cm
WHERE audit_logs.business_id = cm.duplicate_business_id 
  AND cm.is_canonical = false;

-- Update invites
UPDATE invites 
SET business_id = cm.canonical_business_id
FROM consolidation_mapping cm
WHERE invites.business_id = cm.duplicate_business_id 
  AND cm.is_canonical = false;

-- Reattach memberships from duplicates to canonical
UPDATE business_members 
SET business_id = cm.canonical_business_id
FROM consolidation_mapping cm
WHERE business_members.business_id = cm.duplicate_business_id 
  AND cm.is_canonical = false;

-- Set each owner's default business in profiles
UPDATE profiles 
SET default_business_id = cm.canonical_business_id
FROM consolidation_mapping cm
WHERE profiles.id = cm.owner_id
  AND cm.is_canonical = true;

-- Delete duplicate businesses (no references remain)
DELETE FROM businesses 
USING consolidation_mapping cm
WHERE businesses.id = cm.duplicate_business_id 
  AND cm.is_canonical = false;

-- Phase B: Prevent future duplicates

-- Enforce "one owner membership per user"
CREATE UNIQUE INDEX IF NOT EXISTS ux_owner_one_business_per_user
  ON business_members(user_id)
  WHERE role = 'owner';

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_business_id ON jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_quotes_business_id ON quotes(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_members_business ON business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON business_members(user_id);