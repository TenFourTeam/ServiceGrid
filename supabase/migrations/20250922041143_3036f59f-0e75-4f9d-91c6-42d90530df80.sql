-- Fix minor security warning by updating function search_path
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members bm
    JOIN public.profiles p ON p.id = bm.user_id
    WHERE bm.business_id = p_business_id 
    AND p.clerk_user_id = public.current_clerk_user_id()
  );
$$;