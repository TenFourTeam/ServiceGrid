-- Update all existing jobs from 'scheduled' to 'appointment'
UPDATE public.jobs 
SET job_type = 'appointment' 
WHERE job_type = 'scheduled';