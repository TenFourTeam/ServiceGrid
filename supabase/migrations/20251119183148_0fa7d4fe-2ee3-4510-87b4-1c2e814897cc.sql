-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Phone Numbers Table
CREATE TABLE public.phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL, -- E.164 format
  friendly_name TEXT,
  twilio_sid TEXT UNIQUE NOT NULL,
  capabilities JSONB DEFAULT '{"voice": true, "sms": true}',
  business_hours JSONB DEFAULT '{"enabled": false, "schedule": {}}',
  ai_agent_enabled BOOLEAN DEFAULT false,
  ai_agent_config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Call Logs Table
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES public.phone_numbers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  call_sid TEXT UNIQUE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  
  status TEXT NOT NULL CHECK (status IN ('queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled')),
  duration_seconds INTEGER,
  recording_url TEXT,
  transcript TEXT,
  
  ai_handled BOOLEAN DEFAULT false,
  ai_summary TEXT,
  
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- VoIP Devices Table (for softphone registration)
CREATE TABLE public.voip_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  device_name TEXT NOT NULL,
  device_type TEXT DEFAULT 'web' CHECK (device_type IN ('web', 'mobile', 'desktop')),
  
  last_seen_at TIMESTAMPTZ,
  push_token TEXT, -- For mobile push notifications
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_id, user_id, device_name)
);

-- Indexes
CREATE INDEX idx_phone_numbers_business_id ON public.phone_numbers(business_id);
CREATE INDEX idx_phone_numbers_twilio_sid ON public.phone_numbers(twilio_sid);

CREATE INDEX idx_call_logs_business_id ON public.call_logs(business_id);
CREATE INDEX idx_call_logs_customer_id ON public.call_logs(customer_id);
CREATE INDEX idx_call_logs_user_id ON public.call_logs(user_id);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at DESC);
CREATE INDEX idx_call_logs_status ON public.call_logs(status);

CREATE INDEX idx_voip_devices_business_user ON public.voip_devices(business_id, user_id);

-- RLS Policies
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voip_devices ENABLE ROW LEVEL SECURITY;

-- Phone Numbers: Business members can view, owners can manage
CREATE POLICY "Business members can view phone numbers"
  ON public.phone_numbers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_permissions
      WHERE business_permissions.business_id = phone_numbers.business_id
        AND business_permissions.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert phone numbers"
  ON public.phone_numbers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = phone_numbers.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update phone numbers"
  ON public.phone_numbers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = phone_numbers.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete phone numbers"
  ON public.phone_numbers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = phone_numbers.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

-- Call Logs: Business members can view
CREATE POLICY "Business members can view call logs"
  ON public.call_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_permissions
      WHERE business_permissions.business_id = call_logs.business_id
        AND business_permissions.user_id = auth.uid()
    )
  );

-- VoIP Devices: Users can manage their own devices
CREATE POLICY "Users can view their own devices"
  ON public.voip_devices FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own devices"
  ON public.voip_devices FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own devices"
  ON public.voip_devices FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own devices"
  ON public.voip_devices FOR DELETE
  USING (user_id = auth.uid());

-- Enable Realtime for call_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_phone_numbers_updated_at
  BEFORE UPDATE ON public.phone_numbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voip_devices_updated_at
  BEFORE UPDATE ON public.voip_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();