-- Migration: Prepare database for Supabase Auth migration
-- This migration adds FK to auth.users and simplifies RLS functions

-- Step 1: Add foreign key constraint from profiles.id to auth.users.id
-- This ensures 1:1 mapping between Supabase auth and profiles
-- NOTE: We can't add this FK yet because existing profiles have UUIDs that don't exist in auth.users
-- We'll need to handle this during user migration. For now, we'll just update the RLS functions.

-- Step 2: Update RLS helper functions to use auth.uid() directly
-- This prepares the database for Supabase Auth where auth.uid() returns the user's UUID directly

-- Replace current_user_profile_id to use auth.uid() directly
-- After migration, profiles.id will equal auth.uid()
CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_profile_id() TO authenticated;

-- Update is_business_member to use the simplified current_user_profile_id
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM public.businesses b
      WHERE b.id = p_business_id 
      AND b.owner_id = auth.uid()
    ) OR
    EXISTS(
      SELECT 1 FROM public.business_permissions bp
      WHERE bp.business_id = p_business_id
      AND bp.user_id = auth.uid()
    ),
    false
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO authenticated;

-- Update can_manage_business to use auth.uid() directly
CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM public.businesses b
      WHERE b.id = p_business_id 
      AND b.owner_id = auth.uid()
    ),
    false
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.can_manage_business(uuid) TO authenticated;