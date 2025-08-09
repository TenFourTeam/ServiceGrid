-- Add Clerk mapping to profiles for Clerk-only auth flows
-- Safe: adds a nullable, unique clerk_user_id without touching existing data

-- 1) Add column for Clerk user ID mapping
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS clerk_user_id text;

-- 2) Ensure uniqueness on clerk_user_id (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'profiles_clerk_user_id_key'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_clerk_user_id_key UNIQUE (clerk_user_id);
  END IF;
END $$;

-- 3) (Optional) Add updated_at trigger for profiles if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;