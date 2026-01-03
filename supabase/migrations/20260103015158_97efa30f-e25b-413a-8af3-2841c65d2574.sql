-- Fix missing profile for user 003fee59-f4fa-4c82-96bc-2b4693b73ff1
-- 1. Create profile if missing
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
FROM auth.users au
WHERE au.id = '003fee59-f4fa-4c82-96bc-2b4693b73ff1'
ON CONFLICT (id) DO NOTHING;

-- 2. Create business if missing
INSERT INTO public.businesses (name, owner_id, name_customized)
SELECT 
  split_part(au.email, '@', 1) || '''s Business',
  au.id,
  false
FROM auth.users au
WHERE au.id = '003fee59-f4fa-4c82-96bc-2b4693b73ff1'
AND NOT EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = au.id);

-- 3. Link default_business_id if not set
UPDATE public.profiles p
SET default_business_id = b.id
FROM public.businesses b
WHERE b.owner_id = p.id
AND p.id = '003fee59-f4fa-4c82-96bc-2b4693b73ff1'
AND p.default_business_id IS NULL;