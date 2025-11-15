-- Phase 1: Create Time Breakdown Database Views

-- 1.1: Daily Time Breakdown View
CREATE OR REPLACE VIEW daily_time_breakdown AS
SELECT 
  te.business_id,
  te.user_id,
  p.full_name as user_name,
  DATE(te.clock_in_time) as work_date,
  te.job_id,
  j.title as job_title,
  j.address as job_address,
  -- Calculate minutes from timesheet entries
  EXTRACT(EPOCH FROM (COALESCE(te.clock_out_time, NOW()) - te.clock_in_time)) / 60 as timesheet_minutes,
  -- Count of tasks completed on this date by this user
  COUNT(DISTINCT sci.id) as tasks_completed,
  -- Sum of task time
  SUM(COALESCE(sci.time_spent_minutes, 0)) as task_minutes,
  -- Aggregate task categories
  jsonb_agg(DISTINCT sci.category) FILTER (WHERE sci.category IS NOT NULL) as task_categories
FROM timesheet_entries te
LEFT JOIN profiles p ON p.id = te.user_id
LEFT JOIN jobs j ON j.id = te.job_id
LEFT JOIN sg_checklist_items sci ON 
  sci.timesheet_entry_id = te.id 
  AND sci.is_completed = true
WHERE te.clock_in_time IS NOT NULL
GROUP BY 
  te.business_id, 
  te.user_id, 
  p.full_name,
  DATE(te.clock_in_time),
  te.job_id,
  j.title,
  j.address,
  te.clock_in_time,
  te.clock_out_time
ORDER BY work_date DESC, user_name;

-- 1.2: Weekly Time Breakdown View
CREATE OR REPLACE VIEW weekly_time_breakdown AS
SELECT 
  business_id,
  user_id,
  user_name,
  DATE_TRUNC('week', work_date) as week_start,
  job_id,
  job_title,
  SUM(timesheet_minutes) as total_timesheet_minutes,
  SUM(tasks_completed) as total_tasks_completed,
  SUM(task_minutes) as total_task_minutes,
  jsonb_agg(DISTINCT task_cat) FILTER (WHERE task_cat IS NOT NULL) as all_task_categories
FROM daily_time_breakdown dtb
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(dtb.task_categories, '[]'::jsonb)) task_cat
GROUP BY 
  business_id,
  user_id,
  user_name,
  DATE_TRUNC('week', work_date),
  job_id,
  job_title
ORDER BY week_start DESC, user_name;

-- 1.3: Task Category Breakdown View
CREATE OR REPLACE VIEW task_category_breakdown AS
SELECT 
  sc.business_id,
  sci.category,
  sci.completed_by as user_id,
  p.full_name as user_name,
  DATE(sci.completed_at) as completion_date,
  COUNT(*) as task_count,
  SUM(sci.time_spent_minutes) as total_minutes,
  AVG(sci.time_spent_minutes) as avg_minutes_per_task,
  jsonb_agg(jsonb_build_object(
    'task_title', sci.title,
    'job_title', j.title,
    'minutes', sci.time_spent_minutes,
    'completed_at', sci.completed_at
  )) as tasks
FROM sg_checklist_items sci
JOIN sg_checklists sc ON sc.id = sci.checklist_id
JOIN profiles p ON p.id = sci.completed_by
LEFT JOIN jobs j ON j.id = sc.job_id
WHERE sci.is_completed = true
  AND sci.category IS NOT NULL
  AND sci.completed_at IS NOT NULL
GROUP BY 
  sc.business_id,
  sci.category,
  sci.completed_by,
  p.full_name,
  DATE(sci.completed_at)
ORDER BY completion_date DESC, category;