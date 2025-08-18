-- Step 1: Clean up duplicate businesses first (before adding constraint)

-- Identify and migrate data from duplicate businesses to the oldest one per owner
WITH duplicate_businesses AS (
  SELECT 
    owner_id,
    id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
  FROM businesses
  WHERE owner_id IS NOT NULL
),
businesses_to_keep AS (
  SELECT id as keep_id, owner_id FROM duplicate_businesses WHERE rn = 1
),
businesses_to_delete AS (
  SELECT id as delete_id, owner_id FROM duplicate_businesses WHERE rn > 1
)
-- Update all related tables to point to the oldest business for each owner
UPDATE customers SET business_id = (
  SELECT keep_id FROM businesses_to_keep 
  WHERE businesses_to_keep.owner_id = (
    SELECT owner_id FROM businesses WHERE id = customers.business_id
  )
)
WHERE business_id IN (SELECT delete_id FROM businesses_to_delete);

-- Update quotes  
WITH duplicate_businesses AS (
  SELECT 
    owner_id,
    id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
  FROM businesses
  WHERE owner_id IS NOT NULL
),
businesses_to_keep AS (
  SELECT id as keep_id, owner_id FROM duplicate_businesses WHERE rn = 1
),
businesses_to_delete AS (
  SELECT id as delete_id, owner_id FROM duplicate_businesses WHERE rn > 1
)
UPDATE quotes SET business_id = (
  SELECT keep_id FROM businesses_to_keep 
  WHERE businesses_to_keep.owner_id = (
    SELECT owner_id FROM businesses WHERE id = quotes.business_id
  )
)
WHERE business_id IN (SELECT delete_id FROM businesses_to_delete);

-- Update jobs
WITH duplicate_businesses AS (
  SELECT 
    owner_id,
    id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
  FROM businesses
  WHERE owner_id IS NOT NULL
),
businesses_to_keep AS (
  SELECT id as keep_id, owner_id FROM duplicate_businesses WHERE rn = 1
),
businesses_to_delete AS (
  SELECT id as delete_id, owner_id FROM duplicate_businesses WHERE rn > 1
)
UPDATE jobs SET business_id = (
  SELECT keep_id FROM businesses_to_keep 
  WHERE businesses_to_keep.owner_id = (
    SELECT owner_id FROM businesses WHERE id = jobs.business_id
  )
)
WHERE business_id IN (SELECT delete_id FROM businesses_to_delete);

-- Update invoices
WITH duplicate_businesses AS (
  SELECT 
    owner_id,
    id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
  FROM businesses
  WHERE owner_id IS NOT NULL
),
businesses_to_keep AS (
  SELECT id as keep_id, owner_id FROM duplicate_businesses WHERE rn = 1
),
businesses_to_delete AS (
  SELECT id as delete_id, owner_id FROM duplicate_businesses WHERE rn > 1
)
UPDATE invoices SET business_id = (
  SELECT keep_id FROM businesses_to_keep 
  WHERE businesses_to_keep.owner_id = (
    SELECT owner_id FROM businesses WHERE id = invoices.business_id
  )
)
WHERE business_id IN (SELECT delete_id FROM businesses_to_delete);

-- Update profiles
WITH duplicate_businesses AS (
  SELECT 
    owner_id,
    id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
  FROM businesses
  WHERE owner_id IS NOT NULL
),
businesses_to_keep AS (
  SELECT id as keep_id, owner_id FROM duplicate_businesses WHERE rn = 1
),
businesses_to_delete AS (
  SELECT id as delete_id, owner_id FROM duplicate_businesses WHERE rn > 1
)
UPDATE profiles SET default_business_id = (
  SELECT keep_id FROM businesses_to_keep 
  WHERE businesses_to_keep.owner_id = profiles.id
)
WHERE default_business_id IN (SELECT delete_id FROM businesses_to_delete);

-- Delete duplicate businesses
WITH duplicate_businesses AS (
  SELECT 
    owner_id,
    id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
  FROM businesses
  WHERE owner_id IS NOT NULL
)
DELETE FROM businesses 
WHERE id IN (SELECT id FROM duplicate_businesses WHERE rn > 1);