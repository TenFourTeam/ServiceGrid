-- Phase 1: Clean up existing data and enforce email requirements

-- Clean up customers with invalid emails
UPDATE customers 
SET email = TRIM(email) 
WHERE email LIKE '% %' OR email LIKE ' %' OR email LIKE '% ';

-- Delete any remaining customers with invalid email formats
DELETE FROM customers 
WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' 
   OR email IS NULL 
   OR email = '';

-- Clean up subscribers table
DELETE FROM subscribers WHERE email IS NULL OR email = '';

-- Now add the constraints
ALTER TABLE subscribers ALTER COLUMN email SET NOT NULL;
ALTER TABLE subscribers ADD CONSTRAINT valid_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure customers email is NOT NULL (should already be)
ALTER TABLE customers ALTER COLUMN email SET NOT NULL;
ALTER TABLE customers ADD CONSTRAINT customers_valid_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add business reply_to_email validation
ALTER TABLE businesses ADD CONSTRAINT businesses_valid_reply_to_email 
CHECK (reply_to_email IS NULL OR reply_to_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');