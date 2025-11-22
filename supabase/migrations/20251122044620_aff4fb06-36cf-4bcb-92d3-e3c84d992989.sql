-- Add industry column to businesses table for SOP auto-population
ALTER TABLE public.businesses 
ADD COLUMN industry TEXT NULL;

COMMENT ON COLUMN public.businesses.industry IS 'Industry type slug (e.g., lawn-care, house-cleaning). Used to auto-populate service catalog with industry-specific SOPs.';