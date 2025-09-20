-- Add subscription support to quotes table
ALTER TABLE public.quotes 
ADD COLUMN is_subscription boolean NOT NULL DEFAULT false,
ADD COLUMN stripe_subscription_id text;

-- Add recurring support to jobs table  
ALTER TABLE public.jobs
ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
ADD COLUMN parent_quote_id uuid;

-- Create recurring schedules table for managing subscription logic
CREATE TABLE public.recurring_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL,
  business_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  frequency quote_frequency NOT NULL,
  next_billing_date timestamp with time zone NOT NULL,
  stripe_subscription_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on recurring_schedules
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for recurring_schedules
CREATE POLICY "Business members can read recurring schedules" 
ON public.recurring_schedules 
FOR SELECT 
USING (is_business_member(business_id));

CREATE POLICY "Business members can insert recurring schedules" 
ON public.recurring_schedules 
FOR INSERT 
WITH CHECK (is_business_member(business_id));

CREATE POLICY "Business members can update recurring schedules" 
ON public.recurring_schedules 
FOR UPDATE 
USING (is_business_member(business_id));

CREATE POLICY "Business members can delete recurring schedules" 
ON public.recurring_schedules 
FOR DELETE 
USING (is_business_member(business_id));

-- Add trigger for updated_at
CREATE TRIGGER update_recurring_schedules_updated_at
BEFORE UPDATE ON public.recurring_schedules
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();