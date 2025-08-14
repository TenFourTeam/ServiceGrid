-- Drop the problematic foreign key constraint that links profiles.id to auth.users.id
-- This constraint is incompatible with Clerk authentication where we generate new UUIDs
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Verify the constraint is removed by checking if any other auth.users references exist
-- (This is just a comment for reference - the constraint should now be gone)