-- Add confirmation_token field to jobs table for work order confirmations
ALTER TABLE public.jobs 
ADD COLUMN confirmation_token text;