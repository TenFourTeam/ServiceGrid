-- 1) Create email_logs table for provider-agnostic logging
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  message_id TEXT,
  error TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and add policies
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'Users can view their own email logs'
  ) THEN
    CREATE POLICY "Users can view their own email logs"
    ON public.email_logs
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'Users can insert their own email logs'
  ) THEN
    CREATE POLICY "Users can insert their own email logs"
    ON public.email_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger to keep updated_at in sync
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_email_logs_updated_at'
  ) THEN
    CREATE TRIGGER set_email_logs_updated_at
    BEFORE UPDATE ON public.email_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_user_created ON public.email_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_provider_created ON public.email_logs (provider, created_at DESC);

-- 2) Prepare existing email_senders for Nylas by adding grant column (non-destructive)
ALTER TABLE public.email_senders
  ADD COLUMN IF NOT EXISTS nylas_grant_id TEXT;