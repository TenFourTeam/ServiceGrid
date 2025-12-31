-- Function to handle assessment job completion
CREATE OR REPLACE FUNCTION public.handle_assessment_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process assessment jobs with status changing to Completed
  IF NEW.is_assessment IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Completed' THEN
    -- Update linked request status to 'Assessed'
    IF NEW.request_id IS NOT NULL THEN
      UPDATE requests
      SET status = 'Assessed',
          updated_at = now()
      WHERE id = NEW.request_id
        AND status IN ('New', 'Scheduled');
    END IF;

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
      'automation',
      'Assessment completed - request status updated to Assessed',
      jsonb_build_object(
        'action_type', 'assessment_completed',
        'job_id', NEW.id,
        'request_id', NEW.request_id,
        'completed_at', now()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_assessment_completed ON jobs;
CREATE TRIGGER trg_assessment_completed
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION handle_assessment_completed();