-- Add confirmation tracking columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN confirmation_status text CHECK (confirmation_status IN ('pending', 'confirmed', 'expired')) DEFAULT NULL;

ALTER TABLE public.jobs 
ADD COLUMN confirmed_at timestamp with time zone DEFAULT NULL;

-- Create index for querying by confirmation status
CREATE INDEX idx_jobs_confirmation_status ON public.jobs(confirmation_status) 
WHERE confirmation_status IS NOT NULL;

-- Migrate existing jobs with confirmation tokens
-- Mark jobs as 'confirmed' if they already have 'Schedule Approved' status
UPDATE public.jobs 
SET confirmation_status = 'confirmed',
    confirmed_at = updated_at
WHERE confirmation_token IS NOT NULL 
  AND status = 'Schedule Approved'
  AND confirmation_status IS NULL;

-- Mark other jobs with tokens as 'pending'
UPDATE public.jobs 
SET confirmation_status = 'pending'
WHERE confirmation_token IS NOT NULL 
  AND confirmation_status IS NULL;