-- Add foreign key constraints to recurring_schedules table
-- These are needed for Supabase PostgREST to understand table relationships

ALTER TABLE public.recurring_schedules
ADD CONSTRAINT recurring_schedules_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES public.customers(id) 
ON DELETE RESTRICT;

ALTER TABLE public.recurring_schedules
ADD CONSTRAINT recurring_schedules_quote_id_fkey 
FOREIGN KEY (quote_id) 
REFERENCES public.quotes(id) 
ON DELETE RESTRICT;

ALTER TABLE public.recurring_schedules
ADD CONSTRAINT recurring_schedules_business_id_fkey 
FOREIGN KEY (business_id) 
REFERENCES public.businesses(id) 
ON DELETE CASCADE;