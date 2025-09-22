-- Fix all remaining security functions to have proper search_path
CREATE OR REPLACE FUNCTION public.current_clerk_user_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles 
  WHERE clerk_user_id = public.current_clerk_user_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT bm.role FROM public.business_members bm
     JOIN public.profiles p ON p.id = bm.user_id
     WHERE bm.business_id = p_business_id 
     AND p.clerk_user_id = public.current_clerk_user_id()) = 'owner',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.user_business_role(p_business_id uuid)
RETURNS business_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bm.role FROM public.business_members bm
  JOIN public.profiles p ON p.id = bm.user_id
  WHERE bm.business_id = p_business_id 
  AND p.clerk_user_id = public.current_clerk_user_id()
  LIMIT 1;
$$;