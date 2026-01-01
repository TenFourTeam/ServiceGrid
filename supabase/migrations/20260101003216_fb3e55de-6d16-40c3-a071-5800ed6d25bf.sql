-- Fix RLS helper functions for session-based auth
-- Since we use edge functions with service role for all authenticated data access,
-- these functions return NULL for direct client calls (intentional - forces edge function usage)

-- Drop and recreate current_user_profile_id()
CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- For session-based auth, direct client calls cannot identify users
  -- All authenticated data access must go through edge functions (which use service role)
  -- This returns NULL intentionally to enforce edge function usage
  SELECT NULL::uuid;
$$;

-- Update is_business_member() - works with service role from edge functions
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Service role bypasses RLS, so this is mainly for documentation
  -- Direct client calls will get false (current_user_profile_id returns NULL)
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM public.businesses b
      WHERE b.id = p_business_id 
      AND b.owner_id = current_user_profile_id()
    ) OR
    EXISTS(
      SELECT 1 FROM public.business_permissions bp
      WHERE bp.business_id = p_business_id
      AND bp.user_id = current_user_profile_id()
    ),
    false
  );
$$;

-- Update can_manage_business() for owners only
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
      AND b.owner_id = current_user_profile_id()
    ),
    false
  );
$$;

-- Backfill business_permissions for existing business owners who don't have permission records
INSERT INTO public.business_permissions (business_id, user_id, granted_by)
SELECT b.id, b.owner_id, b.owner_id
FROM public.businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_permissions bp
  WHERE bp.business_id = b.id AND bp.user_id = b.owner_id
);