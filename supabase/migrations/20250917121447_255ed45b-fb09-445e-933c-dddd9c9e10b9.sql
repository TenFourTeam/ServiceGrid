-- Update the request_status enum to replace 'Declined' with 'Archived'
ALTER TYPE request_status RENAME VALUE 'Declined' TO 'Archived';

-- Update any existing records that have 'Declined' status to 'Archived'
-- (This is safe since we just renamed the enum value)
UPDATE public.requests 
SET status = 'Archived' 
WHERE status = 'Declined';