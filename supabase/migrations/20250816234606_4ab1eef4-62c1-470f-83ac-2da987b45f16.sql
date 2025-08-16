-- Fix function search paths to be immutable for security
CREATE OR REPLACE FUNCTION public.current_clerk_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members bm
    JOIN public.profiles p ON p.id = bm.user_id
    WHERE bm.business_id = p_business_id 
    AND p.clerk_user_id = public.current_clerk_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
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
SET search_path = ''
AS $$
  SELECT bm.role FROM public.business_members bm
  JOIN public.profiles p ON p.id = bm.user_id
  WHERE bm.business_id = p_business_id 
  AND p.clerk_user_id = public.current_clerk_user_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ensure_default_business()
RETURNS businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  b public.businesses%ROWTYPE;
  user_id_val uuid;
BEGIN
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Look for existing business via membership (not ownership)
  SELECT b.*
  INTO b
  FROM public.businesses b
  JOIN public.business_members bm ON bm.business_id = b.id
  WHERE bm.user_id = user_id_val AND bm.role = 'owner'
  ORDER BY b.created_at
  LIMIT 1;

  -- If no business exists, create one atomically with membership
  IF NOT FOUND THEN
    -- Insert business
    INSERT INTO public.businesses (name, owner_id)
    VALUES ('My Business', user_id_val)
    RETURNING * INTO b;
    
    -- Insert owner membership (will fail if duplicate due to unique constraint)
    INSERT INTO public.business_members (
      business_id, 
      user_id, 
      role, 
      joined_at
    ) VALUES (
      b.id, 
      user_id_val, 
      'owner',
      now()
    ) ON CONFLICT (user_id) WHERE role = 'owner' DO NOTHING;
    
    -- Update profile default_business_id if not set
    UPDATE public.profiles 
    SET default_business_id = b.id 
    WHERE id = user_id_val AND default_business_id IS NULL;
  END IF;

  RETURN b;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_audit_action(p_business_id uuid, p_user_id uuid, p_action text, p_resource_type text, p_resource_id text DEFAULT NULL::text, p_details jsonb DEFAULT '{}'::jsonb, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    business_id, user_id, action, resource_type, resource_id,
    details, ip_address, user_agent
  ) VALUES (
    p_business_id, p_user_id, p_action, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$function$;