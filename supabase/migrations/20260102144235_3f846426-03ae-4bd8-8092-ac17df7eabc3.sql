-- Add clerk_user_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id 
ON public.profiles(clerk_user_id);

-- Function to get profile ID from Clerk JWT
CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id 
  FROM public.profiles 
  WHERE clerk_user_id = (
    SELECT auth.jwt() ->> 'sub'
  )
  LIMIT 1;
$$;

-- Update is_business_member to use profile lookup
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM public.businesses b
      WHERE b.id = p_business_id 
      AND b.owner_id = current_user_profile_id()
    ) OR
    EXISTS(
      SELECT 1 FROM public.business_permissions bp
      WHERE bp.business_id = p_business_id
      AND bp.user_id = current_user_profile_id()
    ),
    false
  );
$$;

-- Update can_manage_business to use profile lookup
CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM public.businesses b
      WHERE b.id = p_business_id 
      AND b.owner_id = current_user_profile_id()
    ),
    false
  );
$$;