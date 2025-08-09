
-- Drop public snapshot feature (we are removing public quote pages)
DROP TABLE IF EXISTS public.estimate_public_snapshots;

-- Drop legacy/unused email tables
DROP TABLE IF EXISTS public.email_domains;
DROP TABLE IF EXISTS public.email_logs;

-- Drop sender config table (not used with Resend-only flow)
DROP TABLE IF EXISTS public.email_senders;

-- Remove Nylas-specific column from mail_sends (no longer used)
ALTER TABLE public.mail_sends
  DROP COLUMN IF EXISTS nylas_grant_id;
