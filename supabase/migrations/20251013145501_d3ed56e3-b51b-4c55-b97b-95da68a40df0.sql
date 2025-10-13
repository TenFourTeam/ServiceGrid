-- Add unique constraint to prevent duplicate lifecycle emails
-- This ensures that each user can only receive each type of lifecycle email once
ALTER TABLE lifecycle_emails_sent 
ADD CONSTRAINT lifecycle_emails_sent_user_email_type_unique 
UNIQUE (user_id, email_type);