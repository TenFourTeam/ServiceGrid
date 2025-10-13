-- Create lifecycle_emails_sent table for tracking sent emails
CREATE TABLE IF NOT EXISTS public.lifecycle_emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  email_data JSONB,
  CONSTRAINT unique_user_email_type UNIQUE(user_id, email_type)
);

-- Enable RLS
ALTER TABLE public.lifecycle_emails_sent ENABLE ROW LEVEL SECURITY;

-- Service role can manage (for edge functions)
CREATE POLICY "Service role can manage lifecycle emails"
  ON public.lifecycle_emails_sent
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can read their own lifecycle email history
CREATE POLICY "Users can view their own lifecycle emails"
  ON public.lifecycle_emails_sent
  FOR SELECT
  USING (user_id = public.current_user_profile_id());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lifecycle_emails_user_type ON public.lifecycle_emails_sent(user_id, email_type);
CREATE INDEX IF NOT EXISTS idx_lifecycle_emails_sent_at ON public.lifecycle_emails_sent(sent_at);

COMMENT ON TABLE public.lifecycle_emails_sent IS 'Tracks which lifecycle emails have been sent to users to prevent duplicates';