-- Add business name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN business_name TEXT,
ADD COLUMN business_name_customized BOOLEAN DEFAULT false;

-- Migrate existing business names from businesses to profiles
UPDATE public.profiles p
SET 
  business_name = b.name,
  business_name_customized = b.name_customized
FROM public.businesses b
JOIN public.business_members bm ON bm.business_id = b.id
WHERE bm.user_id = p.id AND bm.role = 'owner';

-- Set default business name for profiles without one
UPDATE public.profiles 
SET 
  business_name = 'My Business',
  business_name_customized = false
WHERE business_name IS NULL;