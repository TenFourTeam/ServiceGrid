-- Update any existing records that have 'Declined' status to 'Archived'
UPDATE public.requests 
SET status = 'Archived' 
WHERE status = 'Declined';