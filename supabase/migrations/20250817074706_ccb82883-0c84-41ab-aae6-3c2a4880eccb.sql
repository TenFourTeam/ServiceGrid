-- Add job type and time tracking fields to jobs table
DO $$ 
BEGIN
  -- Create job_type enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
    CREATE TYPE job_type AS ENUM ('scheduled', 'time_and_materials');
  END IF;
END $$;

-- Add new columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS job_type job_type DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS clock_in_time timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS clock_out_time timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS is_clocked_in boolean DEFAULT false;