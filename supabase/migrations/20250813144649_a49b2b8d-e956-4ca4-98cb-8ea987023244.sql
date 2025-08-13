-- Phase 1: Enforce email requirements in database schema

-- First, clean up any existing records without emails in subscribers table
DELETE FROM subscribers WHERE email IS NULL OR email = '';

-- Make email NOT NULL in subscribers table
ALTER TABLE subscribers ALTER COLUMN email SET NOT NULL;

-- Add email format validation constraint
ALTER TABLE subscribers ADD CONSTRAINT valid_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure customers table email constraint is proper (should already be NOT NULL)
ALTER TABLE customers ALTER COLUMN email SET NOT NULL;

-- Add email format validation for customers
ALTER TABLE customers ADD CONSTRAINT customers_valid_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Update businesses to require reply_to_email for sending operations
-- This ensures business owners have a valid email for communications
ALTER TABLE businesses ADD CONSTRAINT businesses_valid_reply_to_email 
CHECK (reply_to_email IS NULL OR reply_to_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');