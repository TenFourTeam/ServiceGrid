-- Business sessions table for Supabase Auth (mirrors customer_sessions pattern)
CREATE TABLE public.business_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  refresh_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  refresh_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  auth_method TEXT NOT NULL DEFAULT 'password',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for fast token lookups
CREATE INDEX idx_business_sessions_token ON public.business_sessions(session_token);
CREATE INDEX idx_business_sessions_refresh ON public.business_sessions(refresh_token);
CREATE INDEX idx_business_sessions_profile ON public.business_sessions(profile_id);
CREATE INDEX idx_business_sessions_expires ON public.business_sessions(expires_at);

-- Add auth columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS magic_token TEXT,
  ADD COLUMN IF NOT EXISTS magic_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add index for magic token lookups
CREATE INDEX idx_profiles_magic_token ON public.profiles(magic_token) WHERE magic_token IS NOT NULL;

-- Enable RLS on business_sessions
ALTER TABLE public.business_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_sessions
CREATE POLICY "Service role can manage all sessions"
  ON public.business_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view their own sessions"
  ON public.business_sessions
  FOR SELECT
  USING (profile_id = current_user_profile_id());

CREATE POLICY "Users can delete their own sessions"
  ON public.business_sessions
  FOR DELETE
  USING (profile_id = current_user_profile_id());

-- Function to clean up expired sessions (can be called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_business_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.business_sessions 
  WHERE expires_at < now() AND refresh_expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;