-- Add 'estimate' to the job_type enum
ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'estimate';

-- Add comment for clarity
COMMENT ON TYPE job_type IS 'Types of jobs: estimate (assessment/quote visit), appointment (scheduled work), time_and_materials (hourly/ongoing work)';