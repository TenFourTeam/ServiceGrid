-- Clean up existing duplicate business_permissions where user is the business owner
-- Owners don't need permissions entries - ownership is via businesses.owner_id
DELETE FROM business_permissions bp
WHERE EXISTS (
  SELECT 1 FROM businesses b 
  WHERE b.id = bp.business_id 
  AND b.owner_id = bp.user_id
);

-- Fix the handle_new_user trigger to NOT create business_permissions for owners
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_business_id uuid;
  user_name text;
BEGIN
  -- Extract name from metadata or email
  user_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );
  
  -- Create profile linked to auth.users
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, user_name);
  
  -- Create default business for the user
  INSERT INTO public.businesses (name, owner_id, name_customized)
  VALUES (user_name || '''s Business', new.id, false)
  RETURNING id INTO new_business_id;
  
  -- Link profile to default business
  UPDATE public.profiles 
  SET default_business_id = new_business_id
  WHERE id = new.id;
  
  -- NOTE: Do NOT create business_permissions for owners
  -- Ownership is determined by businesses.owner_id
  -- business_permissions is only for workers granted access to a business
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;