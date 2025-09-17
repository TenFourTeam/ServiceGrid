-- Create request_status enum
CREATE TYPE request_status AS ENUM ('New', 'Reviewed', 'Scheduled', 'Completed', 'Declined');

-- Create requests table
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  title TEXT NOT NULL,
  property_address TEXT,
  service_details TEXT NOT NULL,
  preferred_assessment_date TIMESTAMP WITH TIME ZONE,
  alternative_date TEXT,
  preferred_times JSONB DEFAULT '[]'::jsonb,
  status request_status NOT NULL DEFAULT 'New',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Create indexes for better query performance
CREATE INDEX idx_requests_business_id ON public.requests(business_id);
CREATE INDEX idx_requests_customer_id ON public.requests(customer_id);
CREATE INDEX idx_requests_status ON public.requests(status);
CREATE INDEX idx_requests_created_at ON public.requests(created_at DESC);