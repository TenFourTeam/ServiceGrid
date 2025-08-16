-- Create function to extract Clerk user ID from JWT
CREATE OR REPLACE FUNCTION public.current_clerk_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    ''
  );
$$;

-- Update profiles table RLS policies to use Clerk user ID
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (public.current_clerk_user_id() = clerk_user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (public.current_clerk_user_id() = clerk_user_id)
WITH CHECK (public.current_clerk_user_id() = clerk_user_id);

-- Update business member functions to use Clerk user ID
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
SET search_path TO 'public'
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
SET search_path TO 'public'
AS $$
  SELECT bm.role FROM public.business_members bm
  JOIN public.profiles p ON p.id = bm.user_id
  WHERE bm.business_id = p_business_id 
  AND p.clerk_user_id = public.current_clerk_user_id()
  LIMIT 1;
$$;