-- Update calculate_lead_score to log scoring activity
CREATE OR REPLACE FUNCTION public.calculate_lead_score()
RETURNS TRIGGER AS $$
DECLARE
  v_score integer := 0;
  v_notes text := '';
  v_qualified boolean;
  v_threshold integer;
  v_auto_score boolean;
BEGIN
  -- Check if auto-scoring is enabled
  SELECT auto_score_leads, lead_score_threshold 
  INTO v_auto_score, v_threshold
  FROM public.automation_settings 
  WHERE business_id = NEW.business_id;
  
  -- If auto-scoring is disabled, skip
  IF NOT COALESCE(v_auto_score, false) THEN
    RETURN NEW;
  END IF;

  -- Calculate score based on data completeness
  IF NEW.name IS NOT NULL AND NEW.name != '' THEN
    v_score := v_score + 15;
    v_notes := v_notes || 'Name provided (+15). ';
  END IF;
  
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    v_score := v_score + 20;
    v_notes := v_notes || 'Email provided (+20). ';
  END IF;
  
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    v_score := v_score + 20;
    v_notes := v_notes || 'Phone provided (+20). ';
  END IF;
  
  IF NEW.address IS NOT NULL AND NEW.address != '' THEN
    v_score := v_score + 25;
    v_notes := v_notes || 'Address provided (+25). ';
  END IF;
  
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 20 THEN
    v_score := v_score + 10;
    v_notes := v_notes || 'Detailed notes (+10). ';
  END IF;
  
  IF NEW.lead_source IS NOT NULL AND NEW.lead_source != '' THEN
    v_score := v_score + 10;
    v_notes := v_notes || 'Lead source tracked (+10). ';
  END IF;

  -- Determine qualification
  v_qualified := v_score >= COALESCE(v_threshold, 40);

  -- Update the customer record
  NEW.lead_score := v_score;
  NEW.is_qualified := v_qualified;
  IF v_qualified AND OLD.qualified_at IS NULL THEN
    NEW.qualified_at := now();
  END IF;
  NEW.qualification_notes := v_notes;

  -- Log activity if score changed significantly
  IF NEW.lead_score != COALESCE(OLD.lead_score, 0) THEN
    INSERT INTO public.ai_activity_log (
      business_id, user_id, activity_type, description, accepted, metadata
    ) VALUES (
      NEW.business_id,
      NEW.business_id,
      'auto_schedule',
      'Auto-scored lead "' || COALESCE(NEW.name, 'Unknown') || '" at ' || v_score || ' points' || 
      CASE WHEN v_qualified THEN ' (qualified)' ELSE '' END,
      true,
      jsonb_build_object(
        'customer_id', NEW.id,
        'score', v_score,
        'qualified', v_qualified,
        'action_type', 'lead_scoring'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update auto_assign_request to log assignments
CREATE OR REPLACE FUNCTION public.auto_assign_request()
RETURNS TRIGGER AS $$
DECLARE
  v_auto_assign boolean;
  v_method text;
  v_assignee_id uuid;
  v_assignee_name text;
BEGIN
  -- Check if auto-assignment is enabled
  SELECT auto_assign_leads, assignment_method 
  INTO v_auto_assign, v_method
  FROM public.automation_settings 
  WHERE business_id = NEW.business_id;
  
  -- If auto-assignment is disabled, skip
  IF NOT COALESCE(v_auto_assign, false) THEN
    RETURN NEW;
  END IF;
  
  -- Skip if already assigned
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Find assignee based on method
  IF v_method = 'workload' THEN
    -- Assign to team member with fewest jobs this week
    SELECT bp.user_id INTO v_assignee_id
    FROM public.business_permissions bp
    LEFT JOIN public.jobs j ON j.owner_id = bp.user_id 
      AND j.created_at > now() - interval '7 days'
      AND j.status NOT IN ('completed', 'cancelled')
    WHERE bp.business_id = NEW.business_id
    GROUP BY bp.user_id
    ORDER BY COUNT(j.id) ASC
    LIMIT 1;
  ELSIF v_method = 'round_robin' THEN
    -- Simple round robin - assign to next team member
    SELECT bp.user_id INTO v_assignee_id
    FROM public.business_permissions bp
    WHERE bp.business_id = NEW.business_id
    ORDER BY RANDOM()
    LIMIT 1;
  ELSE
    -- Default: assign to business owner
    SELECT owner_id INTO v_assignee_id
    FROM public.businesses
    WHERE id = NEW.business_id;
  END IF;

  IF v_assignee_id IS NOT NULL THEN
    NEW.assigned_to := v_assignee_id;
    
    -- Get assignee name for logging
    SELECT name INTO v_assignee_name FROM public.profiles WHERE id = v_assignee_id;
    
    -- Log activity
    INSERT INTO public.ai_activity_log (
      business_id, user_id, activity_type, description, accepted, metadata
    ) VALUES (
      NEW.business_id,
      NEW.business_id,
      'auto_schedule',
      'Auto-assigned request "' || COALESCE(NEW.title, 'Service Request') || '" to ' || COALESCE(v_assignee_name, 'team member'),
      true,
      jsonb_build_object(
        'request_id', NEW.id,
        'assigned_to', v_assignee_id,
        'method', v_method,
        'action_type', 'lead_assignment'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update queue_welcome_email to log queuing
CREATE OR REPLACE FUNCTION public.queue_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  v_auto_send boolean;
  v_delay_minutes integer;
  v_business_name text;
BEGIN
  -- Check if auto-welcome-email is enabled
  SELECT auto_send_welcome_email, welcome_email_delay_minutes 
  INTO v_auto_send, v_delay_minutes
  FROM public.automation_settings 
  WHERE business_id = NEW.business_id;
  
  -- If auto-send is disabled, skip
  IF NOT COALESCE(v_auto_send, false) THEN
    RETURN NEW;
  END IF;
  
  -- Get business name
  SELECT name INTO v_business_name FROM public.businesses WHERE id = NEW.business_id;

  -- Queue the welcome email
  INSERT INTO public.email_queue (
    business_id,
    customer_id,
    recipient_email,
    recipient_name,
    email_type,
    subject,
    scheduled_for
  ) VALUES (
    NEW.business_id,
    NEW.id,
    NEW.email,
    NEW.name,
    'welcome',
    'Welcome to ' || COALESCE(v_business_name, 'our team') || '!',
    now() + (COALESCE(v_delay_minutes, 5) * interval '1 minute')
  );

  -- Log activity
  INSERT INTO public.ai_activity_log (
    business_id, user_id, activity_type, description, accepted, metadata
  ) VALUES (
    NEW.business_id,
    NEW.business_id,
    'auto_schedule',
    'Queued welcome email for "' || COALESCE(NEW.name, NEW.email) || '" (sending in ' || COALESCE(v_delay_minutes, 5) || ' min)',
    true,
    jsonb_build_object(
      'customer_id', NEW.id,
      'email', NEW.email,
      'delay_minutes', COALESCE(v_delay_minutes, 5),
      'action_type', 'welcome_email'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;