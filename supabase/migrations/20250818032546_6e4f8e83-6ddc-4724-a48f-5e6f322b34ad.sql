-- Create profile for the missing user (current authenticated user)
INSERT INTO public.profiles (clerk_user_id, email, full_name, default_business_id)
VALUES (
  'user_31RQe7z73YT7FgCmbjnNPefnBQ5',
  'miles@rainsound.ai',
  'Miles Porter',
  '913ab2c0-afb6-4d84-8e63-582f385d1d5d'
) ON CONFLICT (clerk_user_id) DO NOTHING;

-- Get the profile ID for the new user
-- Then add business memberships for both businesses
WITH new_profile AS (
  SELECT id FROM public.profiles WHERE clerk_user_id = 'user_31RQe7z73YT7FgCmbjnNPefnBQ5'
)
INSERT INTO public.business_members (user_id, business_id, role, joined_at)
SELECT 
  new_profile.id,
  '913ab2c0-afb6-4d84-8e63-582f385d1d5d', -- My Business (as owner)
  'owner',
  now()
FROM new_profile
ON CONFLICT (user_id, business_id) DO NOTHING;

-- Add worker membership to Mowing Co
WITH new_profile AS (
  SELECT id FROM public.profiles WHERE clerk_user_id = 'user_31RQe7z73YT7FgCmbjnNPefnBQ5'
)
INSERT INTO public.business_members (user_id, business_id, role, joined_at)
SELECT 
  new_profile.id,
  'd88c2628-61b5-4f43-8d9d-72e82144b344', -- Mowing Co (as worker)
  'worker',
  now()
FROM new_profile
ON CONFLICT (user_id, business_id) DO NOTHING;