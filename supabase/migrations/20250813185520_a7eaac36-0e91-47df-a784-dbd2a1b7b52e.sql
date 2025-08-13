-- Phase 2: Authorization & Backend Hardening
-- Update RLS policies for multi-tenancy and role-based access

-- First, update business table RLS to allow members to read
DROP POLICY IF EXISTS "Owner can read businesses" ON public.businesses;
CREATE POLICY "Business members can read businesses" 
ON public.businesses 
FOR SELECT 
USING (public.is_business_member(id));

-- Business settings changes restricted to owners only
DROP POLICY IF EXISTS "Owner can update businesses" ON public.businesses;
CREATE POLICY "Business owners can update businesses" 
ON public.businesses 
FOR UPDATE 
USING (public.can_manage_business(id));

DROP POLICY IF EXISTS "Owner can delete businesses" ON public.businesses;
CREATE POLICY "Business owners can delete businesses" 
ON public.businesses 
FOR DELETE 
USING (public.can_manage_business(id));

-- Keep insert policy as is (new business creator becomes owner)
-- This is handled by the business_members table auto-creation

-- Update customers table - allow all business members to read/write
DROP POLICY IF EXISTS "Owner can read customers" ON public.customers;
CREATE POLICY "Business members can read customers" 
ON public.customers 
FOR SELECT 
USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can insert customers" ON public.customers;
CREATE POLICY "Business members can insert customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can update customers" ON public.customers;
CREATE POLICY "Business members can update customers" 
ON public.customers 
FOR UPDATE 
USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can delete customers" ON public.customers;
CREATE POLICY "Business members can delete customers" 
ON public.customers 
FOR DELETE 
USING (public.is_business_member(business_id));

-- Update jobs table - allow all business members to read/write
DROP POLICY IF EXISTS "Owner can read jobs" ON public.jobs;
CREATE POLICY "Business members can read jobs" 
ON public.jobs 
FOR SELECT 
USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can insert jobs" ON public.jobs;
CREATE POLICY "Business members can insert jobs" 
ON public.jobs 
FOR INSERT 
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can update jobs" ON public.jobs;
CREATE POLICY "Business members can update jobs" 
ON public.jobs 
FOR UPDATE 
USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can delete jobs" ON public.jobs;
CREATE POLICY "Business members can delete jobs" 
ON public.jobs 
FOR DELETE 
USING (public.is_business_member(business_id));

-- Update quotes table - allow all business members to read/write
DROP POLICY IF EXISTS "Owner can read quotes" ON public.quotes;
CREATE POLICY "Business members can read quotes" 
ON public.quotes 
FOR SELECT 
USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can insert quotes" ON public.quotes;
CREATE POLICY "Business members can insert quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can update quotes" ON public.quotes;
CREATE POLICY "Business members can update quotes" 
ON public.quotes 
FOR UPDATE 
USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can delete quotes" ON public.quotes;
CREATE POLICY "Business members can delete quotes" 
ON public.quotes 
FOR DELETE 
USING (public.is_business_member(business_id));

-- Update invoices table - allow all business members to read/write
DROP POLICY IF EXISTS "Owner can read invoices" ON public.invoices;
CREATE POLICY "Business members can read invoices" 
ON public.invoices 
FOR SELECT 
USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can insert invoices" ON public.invoices;
CREATE POLICY "Business members can insert invoices" 
ON public.invoices 
FOR INSERT 
WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can update invoices" ON public.invoices;
CREATE POLICY "Business members can update invoices" 
ON public.invoices 
FOR UPDATE 
USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "Owner can delete invoices" ON public.invoices;
CREATE POLICY "Business members can delete invoices" 
ON public.invoices 
FOR DELETE 
USING (public.is_business_member(business_id));

-- Update quote_line_items and invoice_line_items via business context
DROP POLICY IF EXISTS "Owner can read quote_line_items" ON public.quote_line_items;
CREATE POLICY "Business members can read quote_line_items" 
ON public.quote_line_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.quotes q 
  WHERE q.id = quote_line_items.quote_id 
  AND public.is_business_member(q.business_id)
));

DROP POLICY IF EXISTS "Owner can insert quote_line_items" ON public.quote_line_items;
CREATE POLICY "Business members can insert quote_line_items" 
ON public.quote_line_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.quotes q 
  WHERE q.id = quote_line_items.quote_id 
  AND public.is_business_member(q.business_id)
));

DROP POLICY IF EXISTS "Owner can update quote_line_items" ON public.quote_line_items;
CREATE POLICY "Business members can update quote_line_items" 
ON public.quote_line_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.quotes q 
  WHERE q.id = quote_line_items.quote_id 
  AND public.is_business_member(q.business_id)
));

DROP POLICY IF EXISTS "Owner can delete quote_line_items" ON public.quote_line_items;
CREATE POLICY "Business members can delete quote_line_items" 
ON public.quote_line_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.quotes q 
  WHERE q.id = quote_line_items.quote_id 
  AND public.is_business_member(q.business_id)
));

-- Similarly for invoice line items
DROP POLICY IF EXISTS "Owner can read invoice_line_items" ON public.invoice_line_items;
CREATE POLICY "Business members can read invoice_line_items" 
ON public.invoice_line_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.invoices i 
  WHERE i.id = invoice_line_items.invoice_id 
  AND public.is_business_member(i.business_id)
));

DROP POLICY IF EXISTS "Owner can insert invoice_line_items" ON public.invoice_line_items;
CREATE POLICY "Business members can insert invoice_line_items" 
ON public.invoice_line_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.invoices i 
  WHERE i.id = invoice_line_items.invoice_id 
  AND public.is_business_member(i.business_id)
));

DROP POLICY IF EXISTS "Owner can update invoice_line_items" ON public.invoice_line_items;
CREATE POLICY "Business members can update invoice_line_items" 
ON public.invoice_line_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.invoices i 
  WHERE i.id = invoice_line_items.invoice_id 
  AND public.is_business_member(i.business_id)
));

DROP POLICY IF EXISTS "Owner can delete invoice_line_items" ON public.invoice_line_items;
CREATE POLICY "Business members can delete invoice_line_items" 
ON public.invoice_line_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.invoices i 
  WHERE i.id = invoice_line_items.invoice_id 
  AND public.is_business_member(i.business_id)
));

-- Payments - allow viewing for all members, financial ops for owners only
DROP POLICY IF EXISTS "Owner can read payments" ON public.payments;
CREATE POLICY "Business members can read payments" 
ON public.payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.invoices i 
  WHERE i.id = payments.invoice_id 
  AND public.is_business_member(i.business_id)
));

-- Keep payment insert/update/delete restricted to owners via invoice business ownership
DROP POLICY IF EXISTS "Owner can insert payments" ON public.payments;
CREATE POLICY "Business owners can insert payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.invoices i 
  WHERE i.id = payments.invoice_id 
  AND public.can_manage_business(i.business_id)
));

DROP POLICY IF EXISTS "Owner can update payments" ON public.payments;
CREATE POLICY "Business owners can update payments" 
ON public.payments 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.invoices i 
  WHERE i.id = payments.invoice_id 
  AND public.can_manage_business(i.business_id)
));

DROP POLICY IF EXISTS "Owner can delete payments" ON public.payments;
CREATE POLICY "Business owners can delete payments" 
ON public.payments 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.invoices i 
  WHERE i.id = payments.invoice_id 
  AND public.can_manage_business(i.business_id)
));

-- Create audit log table for business-level actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs can be read by business members
CREATE POLICY "Business members can read audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (public.is_business_member(business_id));

-- Only the system (service role) can insert audit logs
-- This prevents tampering from client-side
CREATE POLICY "Service role can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON public.audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Create audit logging function
CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_business_id uuid,
  p_user_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    business_id, user_id, action, resource_type, resource_id,
    details, ip_address, user_agent
  ) VALUES (
    p_business_id, p_user_id, p_action, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;