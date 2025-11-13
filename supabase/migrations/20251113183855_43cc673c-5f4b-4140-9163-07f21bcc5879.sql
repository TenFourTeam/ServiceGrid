-- Phase 1: Link Timesheet to Jobs
ALTER TABLE timesheet_entries 
ADD COLUMN job_id uuid REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX idx_timesheet_entries_job_id ON timesheet_entries(job_id);

-- Phase 3: Task Time Tracking
ALTER TABLE sg_checklist_items
ADD COLUMN time_spent_minutes integer,
ADD COLUMN timesheet_entry_id uuid REFERENCES timesheet_entries(id);

CREATE INDEX idx_checklist_items_timesheet_entry ON sg_checklist_items(timesheet_entry_id);

-- Phase 5: Unified Assignment System
CREATE OR REPLACE VIEW unified_assignments AS
SELECT 
  'job'::text as assignment_type,
  ja.job_id,
  ja.user_id,
  ja.assigned_at as assigned_at,
  null::uuid as checklist_id,
  null::uuid as item_id,
  j.business_id,
  j.title as job_title,
  null::text as item_title
FROM job_assignments ja
JOIN jobs j ON j.id = ja.job_id
UNION ALL
SELECT 
  'checklist_item'::text as assignment_type,
  sc.job_id,
  sci.assigned_to as user_id,
  sci.created_at as assigned_at,
  sc.id as checklist_id,
  sci.id as item_id,
  sc.business_id,
  j.title as job_title,
  sci.title as item_title
FROM sg_checklist_items sci
JOIN sg_checklists sc ON sc.id = sci.checklist_id
JOIN jobs j ON j.id = sc.job_id
WHERE sci.assigned_to IS NOT NULL;

-- Phase 2: Sync Job & Checklist Assignments Function
CREATE OR REPLACE FUNCTION sync_job_checklist_assignments(
  p_job_id uuid,
  p_user_ids uuid[],
  p_assign boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_checklist_id uuid;
BEGIN
  -- For each user being assigned/unassigned to the job
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    -- Get all checklists for this job
    FOR v_checklist_id IN 
      SELECT id FROM sg_checklists WHERE job_id = p_job_id
    LOOP
      IF p_assign THEN
        -- Assign user to all items in this checklist
        UPDATE sg_checklist_items
        SET 
          assigned_to = v_user_id,
          updated_at = now()
        WHERE 
          checklist_id = v_checklist_id 
          AND assigned_to IS NULL;
      ELSE
        -- Unassign user from all items in this checklist
        UPDATE sg_checklist_items
        SET 
          assigned_to = NULL,
          updated_at = now()
        WHERE 
          checklist_id = v_checklist_id 
          AND assigned_to = v_user_id;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Phase 6: Analytics Views
CREATE OR REPLACE VIEW time_by_job_report AS
SELECT 
  j.id as job_id,
  j.title as job_title,
  j.business_id,
  COUNT(DISTINCT te.id) as total_entries,
  SUM(
    CASE 
      WHEN te.clock_out_time IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (te.clock_out_time - te.clock_in_time)) / 60
      ELSE 0
    END
  ) as total_minutes,
  COUNT(DISTINCT te.user_id) as unique_workers
FROM jobs j
LEFT JOIN timesheet_entries te ON te.job_id = j.id
GROUP BY j.id, j.title, j.business_id;

CREATE OR REPLACE VIEW time_by_task_report AS
SELECT 
  sci.id as item_id,
  sci.title as item_title,
  sc.id as checklist_id,
  sc.title as checklist_title,
  sc.job_id,
  j.title as job_title,
  j.business_id,
  sci.time_spent_minutes,
  sci.completed_by,
  sci.completed_at,
  p.full_name as completed_by_name
FROM sg_checklist_items sci
JOIN sg_checklists sc ON sc.id = sci.checklist_id
JOIN jobs j ON j.id = sc.job_id
LEFT JOIN profiles p ON p.id = sci.completed_by
WHERE sci.is_completed = true AND sci.time_spent_minutes IS NOT NULL;

CREATE OR REPLACE VIEW user_productivity_report AS
SELECT 
  p.id as user_id,
  p.full_name,
  bp.business_id,
  COUNT(DISTINCT sci.id) as tasks_completed,
  SUM(sci.time_spent_minutes) as task_minutes,
  COUNT(DISTINCT te.id) as timesheet_entries,
  SUM(
    CASE 
      WHEN te.clock_out_time IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (te.clock_out_time - te.clock_in_time)) / 60
      ELSE 0
    END
  ) as timesheet_minutes,
  CASE 
    WHEN SUM(sci.time_spent_minutes) > 0 
    THEN ROUND(COUNT(DISTINCT sci.id)::numeric / (SUM(sci.time_spent_minutes) / 60.0), 2)
    ELSE 0
  END as tasks_per_hour
FROM profiles p
JOIN business_permissions bp ON bp.user_id = p.id
LEFT JOIN sg_checklist_items sci ON sci.completed_by = p.id AND sci.is_completed = true
LEFT JOIN timesheet_entries te ON te.user_id = p.id AND te.business_id = bp.business_id
GROUP BY p.id, p.full_name, bp.business_id;