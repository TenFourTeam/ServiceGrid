-- Fix security vulnerability: Restrict payment data access to business owners only
-- Drop the overly permissive policy that allows all business members to read payments
DROP POLICY IF EXISTS "Business members can read payments" ON public.payments;

-- Create a new policy that only allows business owners to read payment data
CREATE POLICY "Business owners can read payments" ON public.payments
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM invoices i
    WHERE i.id = payments.invoice_id 
    AND can_manage_business(i.business_id)
  )
);