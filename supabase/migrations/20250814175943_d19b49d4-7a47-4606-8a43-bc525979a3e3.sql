-- Remove name_source column and related logic from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS name_source;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS name_last_synced_at;