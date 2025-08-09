-- Create table to manage authenticated sending domains per user
CREATE TABLE IF NOT EXISTS public.email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | verified | failed
  dns_records JSONB, -- records required to set in DNS
  sendgrid_id INTEGER, -- SendGrid domain authentication ID
  default_from_name TEXT,
  default_from_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_domains_user_domain_unique UNIQUE (user_id, domain)
);

-- Enable RLS
ALTER TABLE public.email_domains ENABLE ROW LEVEL SECURITY;

-- Replace policies to avoid duplicates
DROP POLICY IF EXISTS "Users can view their own email_domains" ON public.email_domains;
DROP POLICY IF EXISTS "Users can insert their own email_domains" ON public.email_domains;
DROP POLICY IF EXISTS "Users can update their own email_domains" ON public.email_domains;
DROP POLICY IF EXISTS "Users can delete their own email_domains" ON public.email_domains;

CREATE POLICY "Users can view their own email_domains" ON public.email_domains
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email_domains" ON public.email_domains
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email_domains" ON public.email_domains
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email_domains" ON public.email_domains
FOR DELETE USING (auth.uid() = user_id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_email_domains_user ON public.email_domains(user_id);

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_email_domains_updated_at ON public.email_domains;
CREATE TRIGGER trg_email_domains_updated_at
BEFORE UPDATE ON public.email_domains
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();