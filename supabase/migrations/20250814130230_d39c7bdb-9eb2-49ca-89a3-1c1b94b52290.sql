-- Phase 1: Database Foundation Fix
-- Fix the core profiles.id NULL constraint violation and strengthen Clerk mapping

BEGIN;

-- Ensure UUID generator is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fix profiles.id to have proper DEFAULT constraint
-- This will prevent the "null value in column id" errors
ALTER TABLE public.profiles 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Strengthen Clerk mapping with unique index for performance
CREATE UNIQUE INDEX IF NOT EXISTS profiles_clerk_user_id_uidx 
  ON public.profiles (clerk_user_id);

-- Verify and add foreign key relationships if they don't exist
-- profiles.default_business_id -> businesses.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_default_business_id_fkey'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_default_business_id_fkey 
    FOREIGN KEY (default_business_id) REFERENCES public.businesses(id);
  END IF;
END $$;

-- business_members.user_id -> profiles.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'business_members_user_id_fkey'
  ) THEN
    ALTER TABLE public.business_members 
    ADD CONSTRAINT business_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;