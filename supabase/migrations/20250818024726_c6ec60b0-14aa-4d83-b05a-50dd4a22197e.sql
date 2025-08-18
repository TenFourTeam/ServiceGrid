-- Remove the problematic constraint that prevents business owners from being workers in other businesses
ALTER TABLE business_members 
DROP CONSTRAINT IF EXISTS business_members_owner_unique;

-- Verify we still have the correct constraints:
-- 1. ux_owner_one_business_per_user (ensures users can only own one business)
-- 2. business_members_business_user_unique (prevents duplicate memberships in same business)

-- Add a better constraint that only prevents multiple owner roles for the same user
-- but allows owners to be workers in other businesses
ALTER TABLE business_members 
ADD CONSTRAINT ux_one_owner_role_per_user 
UNIQUE (user_id) 
DEFERRABLE INITIALLY DEFERRED 
WHERE (role = 'owner');