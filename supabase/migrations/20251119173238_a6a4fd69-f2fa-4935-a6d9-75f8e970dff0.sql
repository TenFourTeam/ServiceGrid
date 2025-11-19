-- Create pricing_rules table for business pricing configuration
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  material_markup_percent NUMERIC DEFAULT 50.0,
  labor_rate_per_hour INTEGER DEFAULT 8500, -- In cents: $85.00/hr
  equipment_markup_percent NUMERIC DEFAULT 30.0,
  minimum_charge INTEGER DEFAULT 15000, -- In cents: $150.00
  emergency_multiplier NUMERIC DEFAULT 1.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Business members can read pricing rules
CREATE POLICY "Business members can read pricing rules"
  ON public.pricing_rules
  FOR SELECT
  USING (is_business_member(business_id));

-- Business owners can manage pricing rules
CREATE POLICY "Business owners can manage pricing rules"
  ON public.pricing_rules
  FOR ALL
  USING (can_manage_business(business_id))
  WITH CHECK (can_manage_business(business_id));

-- Create index for faster lookups
CREATE INDEX idx_pricing_rules_business_id ON public.pricing_rules(business_id);

-- Add trigger to update updated_at
CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();