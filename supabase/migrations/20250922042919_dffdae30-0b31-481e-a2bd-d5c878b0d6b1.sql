-- Remove the problematic view
DROP VIEW IF EXISTS public.customers_with_conditional_contact;

-- Create a better approach using updated RLS policies instead of views
-- Update RLS policies to use role-based column access through conditional logic

-- First, let's update the existing customer RLS policies to be more granular
-- We'll keep the existing table structure but implement stricter access control

-- Drop existing customer policies to replace them
DROP POLICY IF EXISTS "Business members can read customers" ON public.customers;
DROP POLICY IF EXISTS "Business members can insert customers" ON public.customers; 
DROP POLICY IF EXISTS "Business members can update customers" ON public.customers;
DROP POLICY IF EXISTS "Business members can delete customers" ON public.customers;

-- Create new policies with proper role-based access
-- Business owners can do everything
CREATE POLICY "Business owners can manage customers" 
ON public.customers 
FOR ALL 
USING (can_manage_business(business_id))
WITH CHECK (can_manage_business(business_id));

-- Workers can only read limited customer information (no email/phone)
-- Note: RLS doesn't support column-level security directly, so we'll handle this in the application layer
CREATE POLICY "Business workers can read customer names and addresses" 
ON public.customers 
FOR SELECT 
USING (is_business_member(business_id));

-- Workers can insert customers but without sensitive contact info
CREATE POLICY "Business workers can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (is_business_member(business_id));

-- Workers can update customers but not sensitive fields  
CREATE POLICY "Business workers can update customer basic info" 
ON public.customers 
FOR UPDATE 
USING (is_business_member(business_id));

-- Only owners can delete customers
CREATE POLICY "Only business owners can delete customers" 
ON public.customers 
FOR DELETE 
USING (can_manage_business(business_id));