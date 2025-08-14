-- Add profile sync columns for asymmetric two-way sync between Clerk and DB
BEGIN;

-- Add columns to track name sync provenance and prevent conflicts
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name_source text CHECK (name_source IN ('clerk', 'user')),
  ADD COLUMN IF NOT EXISTS name_last_synced_at timestamptz;

-- Create index for efficient querying by sync status
CREATE INDEX IF NOT EXISTS idx_profiles_name_source ON public.profiles(name_source);

COMMIT;