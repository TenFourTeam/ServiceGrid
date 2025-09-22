-- Update all remaining functions with proper search_path
CREATE OR REPLACE FUNCTION public.debug_auth_state()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'auth_uid', auth.uid(),
    'auth_jwt_exists', CASE WHEN auth.jwt() IS NOT NULL THEN true ELSE false END,
    'auth_jwt_sub', auth.jwt() ->> 'sub',
    'auth_jwt_role', auth.jwt() ->> 'role',
    'current_clerk_user_id', public.current_clerk_user_id(),
    'current_user_profile_id', public.current_user_profile_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_default_business()
RETURNS businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Look for existing business via membership (not ownership)
  SELECT b.*
  INTO b
  FROM public.businesses b
  JOIN public.business_members bm ON bm.business_id = b.id
  WHERE bm.user_id = user_profile_id AND bm.role = 'owner'
  ORDER BY b.created_at
  LIMIT 1;

  -- If no business exists, create one atomically with membership
  IF NOT FOUND THEN
    -- Insert business
    INSERT INTO public.businesses (name, owner_id)
    VALUES ('My Business', user_profile_id)
    RETURNING * INTO b;
    
    -- Insert owner membership
    INSERT INTO public.business_members (
      business_id, 
      user_id, 
      role, 
      joined_at
    ) VALUES (
      b.id, 
      user_profile_id, 
      'owner',
      now()
    ) ON CONFLICT (user_id) WHERE role = 'owner' DO NOTHING;
    
    -- Update profile default_business_id if not set
    UPDATE public.profiles 
    SET default_business_id = b.id 
    WHERE id = user_profile_id AND default_business_id IS NULL;
  END IF;

  RETURN b;
END;
$$;