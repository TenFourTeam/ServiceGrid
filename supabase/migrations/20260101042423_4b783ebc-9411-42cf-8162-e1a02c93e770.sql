-- Clean up old custom auth columns from profiles table
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS magic_token,
  DROP COLUMN IF EXISTS magic_token_expires_at;

-- Add foreign key constraint to auth.users if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey 
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;