-- Migrate existing assessment jobs to use the new 'estimate' type
UPDATE jobs 
SET job_type = 'estimate' 
WHERE is_assessment = true AND job_type IS NOT NULL;

-- For jobs with is_assessment but no job_type set
UPDATE jobs 
SET job_type = 'estimate' 
WHERE is_assessment = true AND job_type IS NULL;