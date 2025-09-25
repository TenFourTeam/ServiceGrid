-- Fix user_business_role function to actually check user roles
-- The function needs to accept user_id parameter since it's called from edge functions
-- that already have the authenticated user context

CREATE OR REPLACE FUNCTION public.user_business_role(p_business_id uuid, p_user_id uuid)
RETURNS business_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT bm.role 
     FROM public.business_members bm
     WHERE bm.business_id = p_business_id 
     AND bm.user_id = p_user_id),
    'worker'::business_role
  );
$$;