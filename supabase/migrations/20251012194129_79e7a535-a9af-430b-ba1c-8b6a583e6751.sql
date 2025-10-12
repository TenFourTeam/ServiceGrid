-- Add 'appointment' as a new valid value to job_type enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'appointment' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'job_type')
  ) THEN
    ALTER TYPE job_type ADD VALUE 'appointment';
  END IF;
END $$;