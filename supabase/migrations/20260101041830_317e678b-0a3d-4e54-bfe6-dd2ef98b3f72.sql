-- Phase 1: Migrate to Supabase Auth - Keep same parameter names to avoid policy conflicts

-- 1.1 Update current_user_profile_id() to return auth.uid() instead of NULL
CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

-- 1.2 Update is_business_member() - keep same param name, use auth.uid() directly
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM public.businesses b
      WHERE b.id = p_business_id 
      AND b.owner_id = auth.uid()
    ) OR
    EXISTS(
      SELECT 1 FROM public.business_permissions bp
      WHERE bp.business_id = p_business_id
      AND bp.user_id = auth.uid()
    ),
    false
  );
$$;

-- 1.3 Update can_manage_business() - keep same param name, use auth.uid() directly
CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM public.businesses b
      WHERE b.id = p_business_id 
      AND b.owner_id = auth.uid()
    ),
    false
  );
$$;

-- 1.4 Create auto-provisioning trigger for new Supabase Auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
  
  -- Create business permission for owner
  INSERT INTO public.business_permissions (business_id, user_id, granted_by)
  VALUES (new_business_id, new.id, new.id);
  
  RETURN new;
END;
$$;

-- Create trigger on auth.users (will run when Supabase Auth creates a user)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();