-- Create appointment_change_requests table for customer self-service
CREATE TABLE public.appointment_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('reschedule', 'cancel')),
  
  -- For reschedule requests
  preferred_date DATE,
  alternative_dates JSONB DEFAULT '[]'::jsonb,
  preferred_times TEXT[] DEFAULT '{}',
  
  -- Common fields
  reason TEXT,
  customer_notes TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  business_response TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES public.profiles(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_appointment_change_requests_job_id ON public.appointment_change_requests(job_id);
CREATE INDEX idx_appointment_change_requests_customer_id ON public.appointment_change_requests(customer_id);
CREATE INDEX idx_appointment_change_requests_business_id ON public.appointment_change_requests(business_id);
CREATE INDEX idx_appointment_change_requests_status ON public.appointment_change_requests(status);

-- Enable RLS
ALTER TABLE public.appointment_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role can do everything (for edge functions)
CREATE POLICY "Service role can manage appointment change requests"
  ON public.appointment_change_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Business members can view and respond to requests
CREATE POLICY "Business members can view appointment change requests"
  ON public.appointment_change_requests
  FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY "Business owners can update appointment change requests"
  ON public.appointment_change_requests
  FOR UPDATE
  USING (can_manage_business(business_id));

-- Trigger to update updated_at
CREATE TRIGGER update_appointment_change_requests_updated_at
  BEFORE UPDATE ON public.appointment_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();