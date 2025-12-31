-- ============================================================================
-- LEAD GENERATION AUTOMATION TRIGGERS
-- Creates triggers for auto-scoring leads, auto-assigning requests, and 
-- queueing welcome emails
-- ============================================================================

-- 1. TRIGGER: Auto-calculate lead score on customer insert/update
CREATE OR REPLACE FUNCTION trigger_calculate_lead_score()
RETURNS TRIGGER AS $$
DECLARE
  new_score INTEGER := 0;
  settings RECORD;
BEGIN
  -- Check if auto-scoring is enabled for this business
  SELECT * INTO settings FROM automation_settings 
  WHERE business_id = NEW.business_id LIMIT 1;
  
  IF settings IS NULL OR NOT settings.auto_score_leads THEN
    RETURN NEW;
  END IF;
  
  -- Calculate score based on data completeness
  IF NEW.name IS NOT NULL AND NEW.name != '' THEN new_score := new_score + 15; END IF;
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN new_score := new_score + 20; END IF;
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN new_score := new_score + 20; END IF;
  IF NEW.address IS NOT NULL AND NEW.address != '' THEN new_score := new_score + 15; END IF;
  IF NEW.lead_source IS NOT NULL THEN new_score := new_score + 10; END IF;
  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN new_score := new_score + 10; END IF;
  IF NEW.preferred_days IS NOT NULL AND jsonb_array_length(NEW.preferred_days::jsonb) > 0 THEN 
    new_score := new_score + 10; 
  END IF;
  
  NEW.lead_score := new_score;
  
  -- Auto-qualify if above threshold
  IF new_score >= settings.lead_score_threshold AND NOT COALESCE(NEW.is_qualified, false) THEN
    NEW.is_qualified := true;
    NEW.qualified_at := now();
  END IF;
  
  -- Log the auto-score action
  INSERT INTO ai_activity_log (business_id, user_id, activity_type, description, accepted, metadata)
  VALUES (
    NEW.business_id,
    NEW.owner_id,
    'auto_schedule',
    format('Auto-scored lead "%s" with score %s', NEW.name, new_score),
    true,
    jsonb_build_object('action_type', 'lead_scored', 'customer_id', NEW.id, 'score', new_score)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach lead score trigger to customers table
DROP TRIGGER IF EXISTS trg_calculate_lead_score ON customers;
CREATE TRIGGER trg_calculate_lead_score
  BEFORE INSERT OR UPDATE OF name, email, phone, address, lead_source, notes, preferred_days
  ON customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_lead_score();

-- 2. TRIGGER: Auto-assign new requests to team members
CREATE OR REPLACE FUNCTION trigger_auto_assign_request()
RETURNS TRIGGER AS $$
DECLARE
  settings RECORD;
  assigned_user_id UUID;
  assigned_user_name TEXT;
BEGIN
  -- Only run on insert when no assignment exists
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if auto-assignment is enabled
  SELECT * INTO settings FROM automation_settings 
  WHERE business_id = NEW.business_id LIMIT 1;
  
  IF settings IS NULL OR NOT settings.auto_assign_leads THEN
    RETURN NEW;
  END IF;
  
  -- Find team member based on assignment method
  IF settings.assignment_method = 'workload' THEN
    -- Assign to member with fewest active requests
    SELECT bp.user_id, p.display_name INTO assigned_user_id, assigned_user_name
    FROM business_permissions bp
    JOIN profiles p ON p.id = bp.user_id
    LEFT JOIN requests r ON r.assigned_to = bp.user_id 
      AND r.status NOT IN ('Completed', 'Cancelled')
    WHERE bp.business_id = NEW.business_id
    GROUP BY bp.user_id, p.display_name
    ORDER BY COUNT(r.id) ASC
    LIMIT 1;
  ELSE
    -- Round-robin: assign to member who was assigned longest ago
    SELECT bp.user_id, p.display_name INTO assigned_user_id, assigned_user_name
    FROM business_permissions bp
    JOIN profiles p ON p.id = bp.user_id
    LEFT JOIN requests r ON r.assigned_to = bp.user_id
    WHERE bp.business_id = NEW.business_id
    GROUP BY bp.user_id, p.display_name
    ORDER BY MAX(COALESCE(r.created_at, '1970-01-01')) ASC
    LIMIT 1;
  END IF;
  
  IF assigned_user_id IS NOT NULL THEN
    NEW.assigned_to := assigned_user_id;
    
    -- Log the auto-assignment
    INSERT INTO ai_activity_log (business_id, user_id, activity_type, description, accepted, metadata)
    VALUES (
      NEW.business_id,
      assigned_user_id,
      'auto_schedule',
      format('Auto-assigned request to %s using %s method', COALESCE(assigned_user_name, 'team member'), settings.assignment_method),
      true,
      jsonb_build_object('action_type', 'lead_assigned', 'request_id', NEW.id, 'assigned_to', assigned_user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach auto-assign trigger to requests table
DROP TRIGGER IF EXISTS trg_auto_assign_request ON requests;
CREATE TRIGGER trg_auto_assign_request
  BEFORE INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_request();

-- 3. TRIGGER: Queue welcome email on customer creation
CREATE OR REPLACE FUNCTION trigger_queue_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  settings RECORD;
BEGIN
  -- Check if welcome emails are enabled
  SELECT * INTO settings FROM automation_settings 
  WHERE business_id = NEW.business_id LIMIT 1;
  
  IF settings IS NULL OR NOT settings.auto_send_welcome_email THEN
    RETURN NEW;
  END IF;
  
  -- Only queue if customer has email
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;
  
  -- Queue the welcome email with configured delay
  INSERT INTO email_queue (
    business_id,
    customer_id,
    recipient_email,
    recipient_name,
    email_type,
    scheduled_for,
    status
  ) VALUES (
    NEW.business_id,
    NEW.id,
    NEW.email,
    NEW.name,
    'welcome',
    now() + (settings.welcome_email_delay_minutes || ' minutes')::interval,
    'pending'
  );
  
  -- Log the queued email
  INSERT INTO ai_activity_log (business_id, user_id, activity_type, description, accepted, metadata)
  VALUES (
    NEW.business_id,
    NEW.owner_id,
    'auto_schedule',
    format('Queued welcome email for "%s" scheduled in %s minutes', NEW.name, settings.welcome_email_delay_minutes),
    true,
    jsonb_build_object('action_type', 'email_queued', 'customer_id', NEW.id, 'email_type', 'welcome')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach welcome email trigger to customers table
DROP TRIGGER IF EXISTS trg_queue_welcome_email ON customers;
CREATE TRIGGER trg_queue_welcome_email
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_welcome_email();