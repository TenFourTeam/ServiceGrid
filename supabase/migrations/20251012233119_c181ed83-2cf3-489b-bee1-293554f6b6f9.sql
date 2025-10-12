-- Remove 'scheduled' from job_type enum to match TypeScript types
-- This fixes the type mismatch causing mobile Safari crashes

-- Step 1: Drop the default value temporarily
ALTER TABLE public.jobs ALTER COLUMN job_type DROP DEFAULT;

-- Step 2: Create a new enum without 'scheduled'
CREATE TYPE job_type_new AS ENUM ('appointment', 'time_and_materials');

-- Step 3: Update existing data and change column type
UPDATE public.jobs SET job_type = 'appointment' WHERE job_type = 'scheduled';

ALTER TABLE public.jobs 
  ALTER COLUMN job_type TYPE job_type_new 
  USING job_type::text::job_type_new;

-- Step 4: Set the new default
ALTER TABLE public.jobs ALTER COLUMN job_type SET DEFAULT 'appointment'::job_type_new;

-- Step 5: Drop the old enum and rename the new one
DROP TYPE job_type;
ALTER TYPE job_type_new RENAME TO job_type;