-- ============================================================================
-- Lead Generation DFY: Automation Tables, Columns & Triggers
-- ============================================================================

-- ============================================================================
-- PART 1: Create automation_settings table for per-business configuration
-- ============================================================================

CREATE TABLE public.automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Lead scoring automation
  auto_score_leads boolean NOT NULL DEFAULT true,
  lead_score_threshold integer NOT NULL DEFAULT 40,
  
  -- Welcome email automation
  auto_send_welcome_email boolean NOT NULL DEFAULT false,
  welcome_email_delay_minutes integer NOT NULL DEFAULT 5,
  
  -- Auto-assignment automation
  auto_assign_leads boolean NOT NULL DEFAULT false,
  assignment_method text NOT NULL DEFAULT 'workload' CHECK (assignment_method IN ('workload', 'round_robin', 'territory')),
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

-- Business members can read settings
CREATE POLICY "Business members can read automation settings"
  ON public.automation_settings FOR SELECT
  USING (public.is_business_member(business_id));

-- Only business owners can modify settings
CREATE POLICY "Business owners can manage automation settings"
  ON public.automation_settings FOR ALL
  USING (public.can_manage_business(business_id))
  WITH CHECK (public.can_manage_business(business_id));

-- Create default settings for existing businesses
INSERT INTO public.automation_settings (business_id)
SELECT id FROM public.businesses
ON CONFLICT (business_id) DO NOTHING;

-- Create trigger to auto-create settings for new businesses
CREATE OR REPLACE FUNCTION public.create_default_automation_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.automation_settings (business_id)
  VALUES (NEW.id)
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_business_created_automation_settings
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.create_default_automation_settings();

-- ============================================================================
-- PART 2: Create email_queue table for async email processing
-- ============================================================================

CREATE TABLE public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  
  -- Email details
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text,
  body_template text,
  
  -- Processing status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  scheduled_for timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  error_message text,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for processing queue
CREATE INDEX idx_email_queue_pending 
ON public.email_queue(scheduled_for) 
WHERE status = 'pending';

-- Enable RLS (service role only for processing)
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Service role can manage email queue
CREATE POLICY "Service role manages email queue"
  ON public.email_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 3: Add lead scoring columns to customers table
-- ============================================================================

ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_source text,
ADD COLUMN IF NOT EXISTS is_qualified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS qualified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS qualification_notes text;

-- Index for filtering qualified leads
CREATE INDEX IF NOT EXISTS idx_customers_qualified 
ON public.customers(business_id, is_qualified) 
WHERE is_qualified = true;

COMMENT ON COLUMN public.customers.lead_score IS 'Auto-calculated score 0-100 based on data completeness';
COMMENT ON COLUMN public.customers.is_qualified IS 'Whether lead meets qualification threshold';

-- ============================================================================
-- PART 4: Add assigned_to column to requests table
-- ============================================================================

ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id);

-- ============================================================================
-- PART 5: Create auto-score trigger on customer insert/update
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_lead_score()
RETURNS TRIGGER AS $$
DECLARE
  v_score integer := 0;
  v_notes text := '';
  v_qualified boolean;
  v_threshold integer;
  v_auto_score boolean;
BEGIN
  -- Check if auto-scoring is enabled for this business
  SELECT auto_score_leads, lead_score_threshold 
  INTO v_auto_score, v_threshold
  FROM public.automation_settings
  WHERE business_id = NEW.business_id;
  
  -- Default threshold if no settings
  v_threshold := COALESCE(v_threshold, 40);
  
  -- Skip if auto-scoring disabled
  IF v_auto_score = false THEN
    RETURN NEW;
  END IF;
  
  -- Calculate score based on data completeness
  -- Contact info (max 30 points)
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN 
    v_score := v_score + 10; 
    v_notes := v_notes || 'Has email. ';
  END IF;
  
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN 
    v_score := v_score + 10; 
    v_notes := v_notes || 'Has phone. ';
  END IF;
  
  IF NEW.address IS NOT NULL AND NEW.address != '' THEN 
    v_score := v_score + 10; 
    v_notes := v_notes || 'Has address. ';
  END IF;
  
  -- Scheduling preferences (max 20 points)
  IF NEW.preferred_days IS NOT NULL AND NEW.preferred_days::text != '[]' AND NEW.preferred_days::text != 'null' THEN 
    v_score := v_score + 10; 
    v_notes := v_notes || 'Has scheduling prefs. ';
  END IF;
  
  IF NEW.scheduling_notes IS NOT NULL AND NEW.scheduling_notes != '' THEN 
    v_score := v_score + 10; 
    v_notes := v_notes || 'Has scheduling notes. ';
  END IF;
  
  -- Notes indicate engagement (10 points)
  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN 
    v_score := v_score + 10; 
    v_notes := v_notes || 'Has notes. ';
  END IF;
  
  -- Determine qualification
  v_qualified := v_score >= v_threshold;
  
  -- Update the record
  NEW.lead_score := v_score;
  NEW.qualification_notes := v_notes;
  
  -- Only update qualified status if newly qualified
  IF v_qualified AND (OLD IS NULL OR OLD.is_qualified = false OR OLD.is_qualified IS NULL) THEN
    NEW.is_qualified := true;
    NEW.qualified_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-scoring
CREATE TRIGGER auto_score_lead
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.calculate_lead_score();

-- ============================================================================
-- PART 6: Create welcome email trigger on new customer
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  v_auto_send boolean;
  v_delay_minutes integer;
BEGIN
  -- Check if auto-welcome is enabled
  SELECT auto_send_welcome_email, welcome_email_delay_minutes
  INTO v_auto_send, v_delay_minutes
  FROM public.automation_settings
  WHERE business_id = NEW.business_id;
  
  -- Skip if disabled or no email
  IF v_auto_send IS NOT TRUE OR NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;
  
  -- Queue the welcome email
  INSERT INTO public.email_queue (
    business_id,
    customer_id,
    email_type,
    recipient_email,
    recipient_name,
    scheduled_for
  ) VALUES (
    NEW.business_id,
    NEW.id,
    'welcome',
    NEW.email,
    NEW.name,
    now() + (COALESCE(v_delay_minutes, 5) * interval '1 minute')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (only on INSERT, not UPDATE)
CREATE TRIGGER auto_queue_welcome_email
AFTER INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.queue_welcome_email();

-- ============================================================================
-- PART 7: Create auto-assignment trigger on request insert
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_request()
RETURNS TRIGGER AS $$
DECLARE
  v_auto_assign boolean;
  v_method text;
  v_assignee_id uuid;
BEGIN
  -- Check if auto-assignment is enabled
  SELECT auto_assign_leads, assignment_method
  INTO v_auto_assign, v_method
  FROM public.automation_settings
  WHERE business_id = NEW.business_id;
  
  -- Skip if disabled or already assigned
  IF v_auto_assign IS NOT TRUE OR NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find assignee based on method (default: workload balancing)
  IF v_method = 'workload' OR v_method IS NULL THEN
    -- Get team member with least assignments this week
    SELECT bp.user_id INTO v_assignee_id
    FROM public.business_permissions bp
    LEFT JOIN (
      SELECT ja.user_id, COUNT(*) as job_count
      FROM public.job_assignments ja
      JOIN public.jobs j ON ja.job_id = j.id
      WHERE j.starts_at >= date_trunc('week', now())
        AND j.starts_at < date_trunc('week', now()) + interval '1 week'
        AND j.business_id = NEW.business_id
      GROUP BY ja.user_id
    ) workload ON bp.user_id = workload.user_id
    WHERE bp.business_id = NEW.business_id
    ORDER BY COALESCE(workload.job_count, 0) ASC
    LIMIT 1;
  ELSIF v_method = 'round_robin' THEN
    -- Simple round robin: pick least recently assigned
    SELECT bp.user_id INTO v_assignee_id
    FROM public.business_permissions bp
    LEFT JOIN (
      SELECT ja.user_id, MAX(ja.assigned_at) as last_assigned
      FROM public.job_assignments ja
      JOIN public.jobs j ON ja.job_id = j.id
      WHERE j.business_id = NEW.business_id
      GROUP BY ja.user_id
    ) recent ON bp.user_id = recent.user_id
    WHERE bp.business_id = NEW.business_id
    ORDER BY COALESCE(recent.last_assigned, '1970-01-01'::timestamp with time zone) ASC
    LIMIT 1;
  END IF;
  
  -- Update the request with assigned user (if we found one)
  IF v_assignee_id IS NOT NULL THEN
    NEW.assigned_to := v_assignee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-assignment
CREATE TRIGGER auto_assign_new_request
BEFORE INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_request();