-- Make mail_sends.user_id nullable to allow logging without a Supabase-authenticated user
ALTER TABLE public.mail_sends
  ALTER COLUMN user_id DROP NOT NULL;