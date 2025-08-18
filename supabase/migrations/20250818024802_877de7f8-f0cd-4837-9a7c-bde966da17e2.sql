-- Remove the problematic constraint that prevents business owners from being workers in other businesses
ALTER TABLE business_members 
DROP CONSTRAINT IF EXISTS business_members_owner_unique;

-- Note: We're keeping these constraints which are correct:
-- - ux_owner_one_business_per_user (ensures users can only own one business)  
-- - business_members_business_user_unique (prevents duplicate memberships in same business)