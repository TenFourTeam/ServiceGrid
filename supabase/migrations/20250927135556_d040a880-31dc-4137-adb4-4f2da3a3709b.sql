-- Drop the business_members table entirely
DROP TABLE IF EXISTS public.business_members CASCADE;

-- Update is_business_member function to check ownership OR accepted invites
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Check if user is the owner OR has an accepted invite
  SELECT COALESCE(
    -- Check ownership first
    EXISTS(
      SELECT 1 FROM public.businesses b
      JOIN public.profiles p ON p.id = b.owner_id
      WHERE b.id = p_business_id 
      AND p.clerk_user_id = public.current_clerk_user_id()
    ) OR
    -- Check accepted invites
    EXISTS(
      SELECT 1 FROM public.invites i
      JOIN public.profiles p ON p.email = i.email
      WHERE i.business_id = p_business_id
      AND p.clerk_user_id = public.current_clerk_user_id()
      AND i.accepted_at IS NOT NULL
      AND i.revoked_at IS NULL
      AND i.expires_at > now()
    ),
    false
  );
$function$;

-- Update can_manage_business function to only check ownership
CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Only owners can manage business
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM public.businesses b
      JOIN public.profiles p ON p.id = b.owner_id
      WHERE b.id = p_business_id 
      AND p.clerk_user_id = public.current_clerk_user_id()
    ),
    false
  );
$function$;