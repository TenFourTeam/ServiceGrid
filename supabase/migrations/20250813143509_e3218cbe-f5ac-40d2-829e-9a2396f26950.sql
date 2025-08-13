-- Fix subscribers table to handle null emails (for users without email in Clerk tokens)
ALTER TABLE subscribers ALTER COLUMN email DROP NOT NULL;

-- Create unique constraint that handles nulls properly  
DROP INDEX IF EXISTS subscribers_email_key;
CREATE UNIQUE INDEX subscribers_email_unique ON subscribers (email) WHERE email IS NOT NULL;

-- Ensure existing customers without emails are handled
UPDATE customers SET email = 'placeholder@example.com' WHERE email IS NULL OR email = '';

-- Make customer email required for business functionality
ALTER TABLE customers ALTER COLUMN email SET NOT NULL;