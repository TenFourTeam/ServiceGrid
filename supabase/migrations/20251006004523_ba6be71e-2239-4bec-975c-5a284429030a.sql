-- Fix is_business_member function to use correct schema
-- The invites table uses invited_user_id (uuid), not email

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
    -- Check accepted invites using invited_user_id instead of email
    EXISTS(
      SELECT 1 FROM public.invites i
      JOIN public.profiles p ON p.id = i.invited_user_id
      WHERE i.business_id = p_business_id
      AND p.clerk_user_id = public.current_clerk_user_id()
      AND i.accepted_at IS NOT NULL
      AND i.revoked_at IS NULL
      AND i.expires_at > now()
    ),
    false
  );
$function$;