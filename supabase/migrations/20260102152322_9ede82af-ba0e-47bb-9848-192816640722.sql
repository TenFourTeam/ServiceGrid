-- Remove the foreign key constraint from profiles.id to auth.users
-- Since we're using Clerk authentication, profiles are linked via clerk_user_id instead
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;