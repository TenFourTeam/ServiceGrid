-- Fix business_members table constraints to match the conflict resolution patterns

-- First, check if the unique constraint exists and create it if needed
-- This constraint allows only one owner per user across all businesses
DO $$ 
BEGIN
    -- Add unique constraint for (user_id) WHERE role = 'owner' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'business_members_owner_unique'
    ) THEN
        ALTER TABLE public.business_members 
        ADD CONSTRAINT business_members_owner_unique 
        UNIQUE (user_id) 
        DEFERRABLE INITIALLY DEFERRED;
        
        -- Add partial unique index for owner role only
        CREATE UNIQUE INDEX IF NOT EXISTS business_members_user_owner_idx 
        ON public.business_members (user_id) 
        WHERE role = 'owner';
    END IF;
END $$;