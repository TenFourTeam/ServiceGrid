-- Clean up duplicate user_business_role functions
-- Keep only the proper implementation that takes both business_id and user_id parameters
DROP FUNCTION IF EXISTS public.user_business_role(uuid);

-- Ensure we have the correct function that takes both parameters
CREATE OR REPLACE FUNCTION public.user_business_role(p_business_id uuid, p_user_id uuid)
 RETURNS business_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT bm.role 
     FROM public.business_members bm
     WHERE bm.business_id = p_business_id 
     AND bm.user_id = p_user_id),
    'worker'::business_role
  );
$function$;