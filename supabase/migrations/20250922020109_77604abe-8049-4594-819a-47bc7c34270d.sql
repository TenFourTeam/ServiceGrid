-- Configure Supabase for Clerk third-party authentication
-- This enables Supabase to recognize and validate Clerk JWTs

-- Add third-party auth configuration for Clerk
-- Note: This may require manual configuration in Supabase dashboard
-- at /project/_/auth/third-party for the full setup

-- For now, let's ensure our database functions work with Clerk integration
-- and create a test to verify the token is being received

-- Test function to debug authentication state
CREATE OR REPLACE FUNCTION public.debug_auth_state()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
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