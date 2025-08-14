-- Add missing database functions and triggers for single business per user model

-- Function to ensure default business membership consistency
CREATE OR REPLACE FUNCTION public.ensure_default_business_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a default_business_id, ensure user has membership in that business
  IF NEW.default_business_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.business_members 
      WHERE user_id = NEW.id AND business_id = NEW.default_business_id
    ) THEN
      RAISE EXCEPTION 'Cannot set default_business_id to a business where user has no membership';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate default business membership
DROP TRIGGER IF EXISTS validate_default_business_membership ON public.profiles;
CREATE TRIGGER validate_default_business_membership
  BEFORE UPDATE OF default_business_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_default_business_membership();

-- Update ensure_default_business function for single business model
CREATE OR REPLACE FUNCTION public.ensure_default_business()
RETURNS businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;