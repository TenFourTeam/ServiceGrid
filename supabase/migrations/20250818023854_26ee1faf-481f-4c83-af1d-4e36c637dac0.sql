-- Fix business duplication issues and add proper constraints

-- Step 1: Add unique constraint on businesses.owner_id if not exists
ALTER TABLE businesses 
ADD CONSTRAINT ux_businesses_owner_id_unique UNIQUE (owner_id);

-- Step 2: Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_members_user_role ON business_members(user_id, role);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);

-- Step 3: Clean up duplicate businesses - keep oldest business per owner
WITH duplicate_businesses AS (
  SELECT 
    owner_id,
    id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
  FROM businesses
  WHERE owner_id IS NOT NULL
),
businesses_to_delete AS (
  SELECT id FROM duplicate_businesses WHERE rn > 1
),
-- Move all related data to the oldest business for each owner
data_migration AS (
  -- Update customers
  UPDATE customers 
  SET business_id = (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = customers.owner_id 
    ORDER BY b.created_at ASC 
    LIMIT 1
  )
  WHERE business_id IN (SELECT id FROM businesses_to_delete)
),
data_migration2 AS (
  -- Update quotes
  UPDATE quotes 
  SET business_id = (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = quotes.owner_id 
    ORDER BY b.created_at ASC 
    LIMIT 1
  )
  WHERE business_id IN (SELECT id FROM businesses_to_delete)
),
data_migration3 AS (
  -- Update jobs
  UPDATE jobs 
  SET business_id = (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = jobs.owner_id 
    ORDER BY b.created_at ASC 
    LIMIT 1
  )
  WHERE business_id IN (SELECT id FROM businesses_to_delete)
),
data_migration4 AS (
  -- Update invoices
  UPDATE invoices 
  SET business_id = (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = invoices.owner_id 
    ORDER BY b.created_at ASC 
    LIMIT 1
  )
  WHERE business_id IN (SELECT id FROM businesses_to_delete)
),
data_migration5 AS (
  -- Update business_members to point to oldest business
  UPDATE business_members 
  SET business_id = (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = (
      SELECT owner_id FROM businesses WHERE id = business_members.business_id
    )
    ORDER BY b.created_at ASC 
    LIMIT 1
  )
  WHERE business_id IN (SELECT id FROM businesses_to_delete)
),
data_migration6 AS (
  -- Update profile default_business_id
  UPDATE profiles 
  SET default_business_id = (
    SELECT b.id 
    FROM businesses b 
    WHERE b.owner_id = profiles.id 
    ORDER BY b.created_at ASC 
    LIMIT 1
  )
  WHERE default_business_id IN (SELECT id FROM businesses_to_delete)
),
data_migration7 AS (
  -- Update audit_logs
  UPDATE audit_logs 
  SET business_id = (
    SELECT b.id 
    FROM businesses b 
    JOIN profiles p ON p.id = b.owner_id
    WHERE p.id = audit_logs.user_id 
    ORDER BY b.created_at ASC 
    LIMIT 1
  )
  WHERE business_id IN (SELECT id FROM businesses_to_delete)
)
-- Finally, delete duplicate businesses
DELETE FROM businesses WHERE id IN (SELECT id FROM businesses_to_delete);

-- Step 4: Remove duplicate business_members entries
DELETE FROM business_members 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, business_id) id
  FROM business_members
  ORDER BY user_id, business_id, created_at ASC
);

-- Step 5: Ensure all business owners have proper memberships
INSERT INTO business_members (business_id, user_id, role, joined_at)
SELECT b.id, b.owner_id, 'owner', b.created_at
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM business_members bm 
  WHERE bm.business_id = b.id 
  AND bm.user_id = b.owner_id 
  AND bm.role = 'owner'
)
ON CONFLICT (user_id, business_id) DO NOTHING;