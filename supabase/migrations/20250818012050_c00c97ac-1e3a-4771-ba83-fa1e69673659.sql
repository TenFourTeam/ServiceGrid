-- Remove the unique constraint that prevents users from being members of multiple businesses
-- Keep the owner constraint but allow users to be workers in multiple businesses

-- Drop the existing unique constraint on (business_id, user_id)
ALTER TABLE public.business_members 
DROP CONSTRAINT IF EXISTS business_members_business_id_user_id_key;

-- Update the constraint to only prevent multiple memberships within the same business
-- This allows users to be members of multiple businesses but only once per business
ALTER TABLE public.business_members 
ADD CONSTRAINT business_members_business_user_unique 
UNIQUE (business_id, user_id);

-- Keep the owner constraint - users can only be owner of one business
-- The existing constraint business_members_owner_unique already handles this