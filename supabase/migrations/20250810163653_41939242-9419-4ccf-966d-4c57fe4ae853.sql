-- Add optional title to jobs for custom job naming
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS title text;
