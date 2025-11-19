-- Create service_catalog table for AI job estimation
CREATE TABLE public.service_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  description TEXT,
  unit_price INTEGER NOT NULL, -- Price in cents
  unit_type TEXT NOT NULL DEFAULT 'per_job', -- per_job, per_hour, per_sqft, etc.
  category TEXT, -- Mowing, Trimming, Cleanup, etc.
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

-- Business members can read service catalog
CREATE POLICY "Business members can read service catalog"
  ON public.service_catalog
  FOR SELECT
  USING (is_business_member(business_id));

-- Business owners can manage service catalog
CREATE POLICY "Business owners can manage service catalog"
  ON public.service_catalog
  FOR ALL
  USING (can_manage_business(business_id))
  WITH CHECK (can_manage_business(business_id));

-- Create index for faster lookups
CREATE INDEX idx_service_catalog_business_id ON public.service_catalog(business_id);
CREATE INDEX idx_service_catalog_active ON public.service_catalog(business_id, is_active) WHERE is_active = true;

-- Update trigger for updated_at
CREATE TRIGGER set_service_catalog_updated_at
  BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();