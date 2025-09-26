-- Create the missing current_clerk_user_id function first
CREATE OR REPLACE FUNCTION public.current_clerk_user_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    ''
  );
$$;

-- Create current_user_profile_id function for convenience
CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.profiles 
  WHERE clerk_user_id = public.current_clerk_user_id()
  LIMIT 1;
$$;