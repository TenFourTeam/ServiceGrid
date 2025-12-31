-- ============================================
-- Site Assessment Automation Triggers
-- ============================================
-- Trigger 1: trg_assessment_job_created
-- When an assessment job is created, auto-create checklist and update request status

CREATE OR REPLACE FUNCTION public.handle_assessment_job_created()
RETURNS TRIGGER AS $$
DECLARE
  v_automation_settings RECORD;
  v_template RECORD;
  v_checklist_id UUID;
BEGIN
  -- Only process assessment jobs
  IF NEW.is_assessment IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Get automation settings for this business
  SELECT * INTO v_automation_settings
  FROM automation_settings
  WHERE business_id = NEW.business_id
  LIMIT 1;

  -- Auto-create checklist from template if enabled
  IF v_automation_settings.auto_create_assessment_checklist IS TRUE 
     AND v_automation_settings.assessment_checklist_template_id IS NOT NULL THEN
    
    -- Get template
    SELECT * INTO v_template
    FROM sg_checklist_templates
    WHERE id = v_automation_settings.assessment_checklist_template_id;

    IF v_template.id IS NOT NULL THEN
      -- Create checklist from template
      INSERT INTO sg_checklists (
        job_id,
        business_id,
        owner_id,
        name,
        description,
        template_id
      ) VALUES (
        NEW.id,
        NEW.business_id,
        NEW.owner_id,
        COALESCE(v_template.name, 'Assessment Checklist'),
        v_template.description,
        v_template.id
      )
      RETURNING id INTO v_checklist_id;

      -- Copy template items to checklist
      INSERT INTO sg_checklist_items (
        checklist_id,
        name,
        description,
        position,
        is_required,
        category
      )
      SELECT 
        v_checklist_id,
        name,
        description,
        position,
        is_required,
        category
      FROM sg_checklist_template_items
      WHERE template_id = v_template.id
      ORDER BY position;

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
        'Assessment checklist created automatically from template',
        jsonb_build_object(
          'action_type', 'assessment_checklist_created',
          'job_id', NEW.id,
          'checklist_id', v_checklist_id,
          'template_id', v_template.id
        )
      );
    END IF;
  END IF;

  -- Update linked request status to 'Scheduled' if request_id is set
  IF NEW.request_id IS NOT NULL THEN
    UPDATE requests
    SET status = 'Scheduled',
        updated_at = now()
    WHERE id = NEW.request_id
      AND status = 'New';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trg_assessment_job_created ON jobs;
CREATE TRIGGER trg_assessment_job_created
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION handle_assessment_job_created();

-- ============================================
-- Trigger 2: trg_assessment_photo_uploaded
-- When media is uploaded for an assessment job, auto-tag as 'assessment:before'

CREATE OR REPLACE FUNCTION public.handle_assessment_photo_uploaded()
RETURNS TRIGGER AS $$
DECLARE
  v_job RECORD;
BEGIN
  -- Only process photos
  IF NEW.file_type != 'photo' THEN
    RETURN NEW;
  END IF;

  -- Check if this is for an assessment job
  SELECT * INTO v_job
  FROM jobs
  WHERE id = NEW.job_id
    AND is_assessment IS TRUE;

  IF v_job.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Auto-add 'assessment:before' tag if not already present
  IF NEW.tags IS NULL THEN
    NEW.tags := ARRAY['assessment:before'];
  ELSIF NOT ('assessment:before' = ANY(NEW.tags)) THEN
    NEW.tags := array_append(NEW.tags, 'assessment:before');
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
    'Assessment photo automatically tagged as before photo',
    jsonb_build_object(
      'action_type', 'assessment_photo_uploaded',
      'media_id', NEW.id,
      'job_id', NEW.job_id,
      'tags', NEW.tags
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create or replace the trigger (BEFORE INSERT to modify the row)
DROP TRIGGER IF EXISTS trg_assessment_photo_uploaded ON sg_media;
CREATE TRIGGER trg_assessment_photo_uploaded
  BEFORE INSERT ON sg_media
  FOR EACH ROW
  EXECUTE FUNCTION handle_assessment_photo_uploaded();