-- Step 2: Add unique constraint and clean up business memberships (fixed)

-- Add unique constraint on businesses.owner_id now that duplicates are removed
ALTER TABLE businesses 
ADD CONSTRAINT ux_businesses_owner_id_unique UNIQUE (owner_id);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_business_members_user_role ON business_members(user_id, role);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);

-- Clean up duplicate business_members entries (keep the oldest one per user/business combination)
DELETE FROM business_members 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, business_id) id
  FROM business_members
  ORDER BY user_id, business_id, created_at ASC
);

-- Only create memberships for business owners that actually exist in profiles table
INSERT INTO business_members (business_id, user_id, role, joined_at)
SELECT b.id, b.owner_id, 'owner', b.created_at
FROM businesses b
INNER JOIN profiles p ON p.id = b.owner_id  -- Only include existing profiles
WHERE NOT EXISTS (
  SELECT 1 FROM business_members bm 
  WHERE bm.business_id = b.id 
  AND bm.user_id = b.owner_id 
  AND bm.role = 'owner'
)
ON CONFLICT (user_id, business_id) DO NOTHING;