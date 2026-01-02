-- Remove vestigial Clerk column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS clerk_user_id;