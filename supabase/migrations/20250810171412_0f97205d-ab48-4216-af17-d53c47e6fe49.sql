-- Add job and invoice linkage to mail_sends for better traceability
ALTER TABLE public.mail_sends
  ADD COLUMN IF NOT EXISTS job_id uuid NULL,
  ADD COLUMN IF NOT EXISTS invoice_id uuid NULL;