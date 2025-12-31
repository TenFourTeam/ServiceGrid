-- ============================================================================
-- Customer Communication Process: DFY Automation Triggers
-- ============================================================================

-- Add new automation settings columns for communication
ALTER TABLE public.automation_settings
ADD COLUMN IF NOT EXISTS auto_create_conversations boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_send_job_updates boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_send_followup_email boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS followup_email_delay_hours integer NOT NULL DEFAULT 24;

-- ============================================================================
-- TRIGGER 1: Auto-create conversation on service request
-- Sub-Process 1: Receive Customer Inquiry (DFY)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_auto_create_conversation_on_request()
RETURNS TRIGGER AS $$
DECLARE
  v_settings RECORD;
  v_customer RECORD;
  v_existing_conversation_id UUID;
  v_new_conversation_id UUID;
BEGIN
  -- Check if automation is enabled for this business
  SELECT auto_create_conversations INTO v_settings
  FROM automation_settings
  WHERE business_id = NEW.business_id;
  
  -- If automation not enabled or settings don't exist, skip
  IF v_settings IS NULL OR NOT v_settings.auto_create_conversations THEN
    RETURN NEW;
  END IF;
  
  -- Get customer info
  SELECT id, name, email INTO v_customer
  FROM customers
  WHERE id = NEW.customer_id;
  
  IF v_customer.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if conversation already exists for this customer
  SELECT id INTO v_existing_conversation_id
  FROM sg_conversations
  WHERE customer_id = NEW.customer_id
    AND business_id = NEW.business_id
    AND is_archived = false
  LIMIT 1;
  
  -- If no existing conversation, create one
  IF v_existing_conversation_id IS NULL THEN
    INSERT INTO sg_conversations (
      business_id,
      customer_id,
      title,
      created_by
    ) VALUES (
      NEW.business_id,
      NEW.customer_id,
      'Service Request: ' || COALESCE(v_customer.name, 'Customer'),
      NEW.owner_id
    )
    RETURNING id INTO v_new_conversation_id;
    
    -- Log automation activity
    INSERT INTO ai_activity_log (
      business_id,
      user_id,
      activity_type,
      description,
      metadata
    ) VALUES (
      NEW.business_id,
      NEW.owner_id,
      'auto_create_conversation',
      'Auto-created conversation for new service request',
      jsonb_build_object(
        'conversation_id', v_new_conversation_id,
        'customer_id', NEW.customer_id,
        'request_id', NEW.id,
        'trigger', 'trg_auto_create_conversation_on_request'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on requests table
DROP TRIGGER IF EXISTS trg_auto_create_conversation_on_request ON public.requests;
CREATE TRIGGER trg_auto_create_conversation_on_request
  AFTER INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_create_conversation_on_request();

-- ============================================================================
-- TRIGGER 2: Auto-notify customer on job status change
-- Sub-Process 4: Real-Time Service Updates (DFY)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_job_status_customer_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_settings RECORD;
  v_customer RECORD;
  v_conversation_id UUID;
  v_status_message TEXT;
  v_worker_name TEXT;
BEGIN
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Only notify for customer-relevant status changes
  IF NEW.status NOT IN ('en_route', 'in_progress', 'completed') THEN
    RETURN NEW;
  END IF;
  
  -- Check if automation is enabled
  SELECT auto_send_job_updates INTO v_settings
  FROM automation_settings
  WHERE business_id = NEW.business_id;
  
  IF v_settings IS NULL OR NOT v_settings.auto_send_job_updates THEN
    RETURN NEW;
  END IF;
  
  -- Get customer info
  SELECT c.id, c.name, c.email INTO v_customer
  FROM customers c
  WHERE c.id = NEW.customer_id;
  
  IF v_customer.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get worker name if assigned
  SELECT p.full_name INTO v_worker_name
  FROM job_assignments ja
  JOIN profiles p ON p.id = ja.user_id
  WHERE ja.job_id = NEW.id
  LIMIT 1;
  
  -- Get or create conversation for this job
  SELECT id INTO v_conversation_id
  FROM sg_conversations
  WHERE job_id = NEW.id
    AND business_id = NEW.business_id
  LIMIT 1;
  
  IF v_conversation_id IS NULL THEN
    SELECT id INTO v_conversation_id
    FROM sg_conversations
    WHERE customer_id = NEW.customer_id
      AND business_id = NEW.business_id
      AND is_archived = false
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- If still no conversation, create one
  IF v_conversation_id IS NULL THEN
    INSERT INTO sg_conversations (
      business_id,
      customer_id,
      job_id,
      title,
      created_by
    ) VALUES (
      NEW.business_id,
      NEW.customer_id,
      NEW.id,
      'Job Update: ' || COALESCE(NEW.title, 'Service'),
      NEW.owner_id
    )
    RETURNING id INTO v_conversation_id;
  END IF;
  
  -- Generate status message
  v_status_message := CASE NEW.status
    WHEN 'en_route' THEN 
      'Your technician' || COALESCE(' (' || v_worker_name || ')', '') || ' is on the way!'
    WHEN 'in_progress' THEN 
      'Your service has started. We''ll update you when complete.'
    WHEN 'completed' THEN 
      'Your service has been completed. Thank you for choosing us!'
    ELSE 
      'Job status updated to: ' || NEW.status
  END;
  
  -- Insert status message into conversation
  INSERT INTO sg_messages (
    conversation_id,
    sender_type,
    content,
    metadata
  ) VALUES (
    v_conversation_id,
    'system',
    v_status_message,
    jsonb_build_object(
      'type', 'status_update',
      'job_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'automated', true
    )
  );
  
  -- Log automation activity
  INSERT INTO ai_activity_log (
    business_id,
    user_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    NEW.business_id,
    NEW.owner_id,
    'auto_job_status_notification',
    'Auto-notified customer of job status: ' || NEW.status,
    jsonb_build_object(
      'job_id', NEW.id,
      'customer_id', NEW.customer_id,
      'conversation_id', v_conversation_id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'trigger', 'trg_job_status_customer_notification'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on jobs table
DROP TRIGGER IF EXISTS trg_job_status_customer_notification ON public.jobs;
CREATE TRIGGER trg_job_status_customer_notification
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_job_status_customer_notification();

-- ============================================================================
-- TRIGGER 3: Auto-queue follow-up email on job completion
-- Sub-Process 5: Follow-Up Post-Service (DFY)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_queue_job_followup_email()
RETURNS TRIGGER AS $$
DECLARE
  v_settings RECORD;
  v_customer RECORD;
  v_business RECORD;
  v_delay_hours INTEGER;
  v_scheduled_time TIMESTAMPTZ;
BEGIN
  -- Only trigger when job is completed
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Check if automation is enabled and get delay
  SELECT auto_send_followup_email, followup_email_delay_hours INTO v_settings
  FROM automation_settings
  WHERE business_id = NEW.business_id;
  
  IF v_settings IS NULL OR NOT v_settings.auto_send_followup_email THEN
    RETURN NEW;
  END IF;
  
  v_delay_hours := COALESCE(v_settings.followup_email_delay_hours, 24);
  v_scheduled_time := NOW() + (v_delay_hours || ' hours')::INTERVAL;
  
  -- Get customer info
  SELECT id, name, email INTO v_customer
  FROM customers
  WHERE id = NEW.customer_id;
  
  IF v_customer.id IS NULL OR v_customer.email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get business info
  SELECT name INTO v_business
  FROM businesses
  WHERE id = NEW.business_id;
  
  -- Check if follow-up already queued for this job
  IF EXISTS (
    SELECT 1 FROM email_queue
    WHERE business_id = NEW.business_id
      AND email_type = 'job_followup'
      AND status = 'pending'
      AND metadata->>'job_id' = NEW.id::TEXT
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Queue the follow-up email
  INSERT INTO email_queue (
    business_id,
    customer_id,
    recipient_email,
    recipient_name,
    email_type,
    subject,
    body_template,
    scheduled_for,
    status
  ) VALUES (
    NEW.business_id,
    NEW.customer_id,
    v_customer.email,
    v_customer.name,
    'job_followup',
    'How was your recent service?',
    'followup_after_job',
    v_scheduled_time,
    'pending'
  );
  
  -- Log automation activity
  INSERT INTO ai_activity_log (
    business_id,
    user_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    NEW.business_id,
    NEW.owner_id,
    'auto_queue_followup_email',
    'Auto-queued follow-up email for ' || v_delay_hours || ' hours after job completion',
    jsonb_build_object(
      'job_id', NEW.id,
      'customer_id', NEW.customer_id,
      'scheduled_for', v_scheduled_time,
      'delay_hours', v_delay_hours,
      'trigger', 'trg_job_complete_followup_queue'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on jobs table
DROP TRIGGER IF EXISTS trg_job_complete_followup_queue ON public.jobs;
CREATE TRIGGER trg_job_complete_followup_queue
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_queue_job_followup_email();

-- ============================================================================
-- Add metadata column to email_queue if not exists (for job tracking)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_queue' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.email_queue ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;