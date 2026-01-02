-- Fix search_path on current_user_profile_id
CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id 
  FROM public.profiles 
  WHERE clerk_user_id = (
    SELECT auth.jwt() ->> 'sub'
  )
  LIMIT 1;
$$;

-- Fix search_path on is_business_member
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

-- Fix search_path on can_manage_business
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