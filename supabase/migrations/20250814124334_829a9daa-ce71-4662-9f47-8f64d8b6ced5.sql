-- Step 1: Add Missing Database Constraints for UUID-First Clerk Integration

-- Add unique index on profiles.clerk_user_id for performance and integrity
CREATE UNIQUE INDEX IF NOT EXISTS profiles_clerk_user_id_uidx 
ON profiles (clerk_user_id) 
WHERE clerk_user_id IS NOT NULL;

-- Add default_business_id column to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS default_business_id uuid;

-- Add foreign key constraint for default_business_id
ALTER TABLE profiles 
ADD CONSTRAINT profiles_default_business_id_fkey 
FOREIGN KEY (default_business_id) REFERENCES businesses(id) 
ON DELETE SET NULL;

-- Ensure clerk_user_id is not null for existing records (after migration validation)
-- We'll make this NOT NULL later after ensuring all profiles have clerk_user_id

-- Add index for better performance on business lookups
CREATE INDEX IF NOT EXISTS profiles_default_business_id_idx 
ON profiles (default_business_id);

-- Add constraint to ensure business members reference valid profiles
ALTER TABLE business_members 
DROP CONSTRAINT IF EXISTS business_members_user_id_fkey;

ALTER TABLE business_members 
ADD CONSTRAINT business_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) 
ON DELETE CASCADE;