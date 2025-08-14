-- Add full_name column to profiles table to store user names
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add phone_e164 column to profiles table to store normalized phone numbers  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_e164 TEXT;