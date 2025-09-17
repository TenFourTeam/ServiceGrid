-- First, add the new 'Archived' value to the enum
ALTER TYPE request_status ADD VALUE 'Archived';

-- Update any existing records that have 'Declined' status to 'Archived'
UPDATE public.requests 
SET status = 'Archived' 
WHERE status = 'Declined';

-- Note: We cannot remove 'Declined' from the enum in PostgreSQL directly
-- But we can prevent its use by updating the validation in the application layer