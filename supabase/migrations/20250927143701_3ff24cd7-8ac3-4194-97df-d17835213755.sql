-- Fix broken database functions that reference deleted business_members table

-- Update user_business_role to use new logic
CREATE OR REPLACE FUNCTION public.user_business_role(p_business_id uuid, p_user_id uuid)
 RETURNS business_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    -- Check if user is the owner
    WHEN EXISTS(
      SELECT 1 FROM public.businesses b
      WHERE b.id = p_business_id AND b.owner_id = p_user_id
    ) THEN 'owner'::business_role
    -- Check if user has accepted invite (worker access)
    WHEN EXISTS(
      SELECT 1 FROM public.invites i
      WHERE i.business_id = p_business_id 
      AND i.redeemed_by = p_user_id
      AND i.redeemed_at IS NOT NULL
      AND i.revoked_at IS NULL
      AND i.expires_at > now()
    ) THEN 'worker'::business_role
    -- Default fallback
    ELSE 'worker'::business_role
  END;
$function$;

-- Update ensure_default_business to only create business (no membership records)
CREATE OR REPLACE FUNCTION public.ensure_default_business()
 RETURNS businesses
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b public.businesses%ROWTYPE;
  user_profile_id uuid;
BEGIN
  -- Get the current user's profile ID
  SELECT id INTO user_profile_id 
  FROM public.profiles 
  WHERE clerk_user_id = public.current_clerk_user_id();
  
  IF user_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for current user';
  END IF;

  -- Look for existing business owned by user
  SELECT b.*
  INTO b
  FROM public.businesses b
  WHERE b.owner_id = user_profile_id
  ORDER BY b.created_at
  LIMIT 1;

  -- If no business exists, create one
  IF NOT FOUND THEN
    -- Insert business
    INSERT INTO public.businesses (name, owner_id)
    VALUES ('My Business', user_profile_id)
    RETURNING * INTO b;
    
    -- Update profile default_business_id if not set
    UPDATE public.profiles 
    SET default_business_id = b.id 
    WHERE id = user_profile_id AND default_business_id IS NULL;
  END IF;

  RETURN b;
END;
$function$;

-- Update ensure_default_business_membership to check new logic
CREATE OR REPLACE FUNCTION public.ensure_default_business_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If setting a default_business_id, ensure user has access to that business
  IF NEW.default_business_id IS NOT NULL THEN
    -- Check if user owns the business OR has accepted invite
    IF NOT (
      -- Check if user owns the business
      EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = NEW.default_business_id AND owner_id = NEW.id
      ) 
      OR
      -- Check if user has accepted invite to the business
      EXISTS (
        SELECT 1 FROM public.invites 
        WHERE business_id = NEW.default_business_id
        AND redeemed_by = NEW.id
        AND redeemed_at IS NOT NULL
        AND revoked_at IS NULL
        AND expires_at > now()
      )
    ) THEN
      RAISE EXCEPTION 'Cannot set default_business_id to a business where user has no ownership or membership';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update can_access_customer_contact_info to use new logic
CREATE OR REPLACE FUNCTION public.can_access_customer_contact_info(p_business_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Only business owners can access customer contact info
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