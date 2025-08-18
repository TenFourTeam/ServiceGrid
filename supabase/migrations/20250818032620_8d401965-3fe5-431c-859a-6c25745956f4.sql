-- Update the existing profile with the current authenticated user's Clerk ID
UPDATE public.profiles 
SET clerk_user_id = 'user_31RQe7z73YT7FgCmbjnNPefnBQ5'
WHERE email = 'miles@rainsound.ai' 
  AND clerk_user_id = 'user_31RGSXTmPvIAD9OK9HF8WcUgbDv';

-- Verify the business memberships are correct for this user
-- The user should be:
-- 1. Owner of "My Business" (913ab2c0-afb6-4d84-8e63-582f385d1d5d)
-- 2. Worker of "Mowing Co" (d88c2628-61b5-4f43-8d9d-72e82144b344)