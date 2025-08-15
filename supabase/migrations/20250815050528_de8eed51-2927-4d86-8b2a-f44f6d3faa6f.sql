-- Remove unused legacy columns from profiles table
-- These columns were creating confusion and are completely unused in current codebase

ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS business_name,
DROP COLUMN IF EXISTS business_name_customized;