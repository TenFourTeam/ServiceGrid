-- Remove duplicate business_permissions, keeping the oldest record (smallest id)
DELETE FROM business_permissions a
USING business_permissions b
WHERE a.id > b.id 
  AND a.business_id = b.business_id 
  AND a.user_id = b.user_id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE business_permissions
ADD CONSTRAINT business_permissions_business_user_unique 
UNIQUE (business_id, user_id);