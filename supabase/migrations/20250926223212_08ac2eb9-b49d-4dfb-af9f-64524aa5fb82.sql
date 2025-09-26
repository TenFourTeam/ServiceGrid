-- Update current users' profiles to set default_business_id to their owned business
-- This fixes any users who don't have their default_business_id set properly
UPDATE public.profiles 
SET default_business_id = b.id
FROM public.businesses b
WHERE profiles.id = b.owner_id 
  AND profiles.default_business_id IS NULL;