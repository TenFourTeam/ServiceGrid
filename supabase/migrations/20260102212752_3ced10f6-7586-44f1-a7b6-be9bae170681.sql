-- Fix Security Definer Views with CASCADE to handle dependencies
-- Drop views in dependency order (weekly depends on daily)

-- Drop all views first with CASCADE
DROP VIEW IF EXISTS public.weekly_time_breakdown CASCADE;
DROP VIEW IF EXISTS public.daily_time_breakdown CASCADE;
DROP VIEW IF EXISTS public.task_category_breakdown CASCADE;
DROP VIEW IF EXISTS public.time_by_job_report CASCADE;
DROP VIEW IF EXISTS public.time_by_task_report CASCADE;
DROP VIEW IF EXISTS public.unified_assignments CASCADE;
DROP VIEW IF EXISTS public.user_productivity_report CASCADE;

-- 1. Recreate daily_time_breakdown with SECURITY INVOKER
CREATE VIEW public.daily_time_breakdown WITH (security_invoker = true) AS
SELECT te.business_id,
    te.user_id,
    p.full_name AS user_name,
    date(te.clock_in_time) AS work_date,
    te.job_id,
    j.title AS job_title,
    j.address AS job_address,
    (EXTRACT(epoch FROM (COALESCE(te.clock_out_time, now()) - te.clock_in_time)) / 60::numeric) AS timesheet_minutes,
    count(DISTINCT sci.id) AS tasks_completed,
    sum(COALESCE(sci.time_spent_minutes, 0)) AS task_minutes,
    jsonb_agg(DISTINCT sci.category) FILTER (WHERE sci.category IS NOT NULL) AS task_categories
FROM timesheet_entries te
LEFT JOIN profiles p ON p.id = te.user_id
LEFT JOIN jobs j ON j.id = te.job_id
LEFT JOIN sg_checklist_items sci ON sci.timesheet_entry_id = te.id AND sci.is_completed = true
WHERE te.clock_in_time IS NOT NULL
GROUP BY te.business_id, te.user_id, p.full_name, date(te.clock_in_time), te.job_id, j.title, j.address, te.clock_in_time, te.clock_out_time
ORDER BY date(te.clock_in_time) DESC, p.full_name;

-- 2. Recreate task_category_breakdown with SECURITY INVOKER
CREATE VIEW public.task_category_breakdown WITH (security_invoker = true) AS
SELECT sc.business_id,
    sci.category,
    sci.completed_by AS user_id,
    p.full_name AS user_name,
    date(sci.completed_at) AS completion_date,
    count(*) AS task_count,
    sum(sci.time_spent_minutes) AS total_minutes,
    avg(sci.time_spent_minutes) AS avg_minutes_per_task,
    jsonb_agg(jsonb_build_object('task_title', sci.title, 'job_title', j.title, 'minutes', sci.time_spent_minutes, 'completed_at', sci.completed_at)) AS tasks
FROM sg_checklist_items sci
JOIN sg_checklists sc ON sc.id = sci.checklist_id
JOIN profiles p ON p.id = sci.completed_by
LEFT JOIN jobs j ON j.id = sc.job_id
WHERE sci.is_completed = true AND sci.category IS NOT NULL AND sci.completed_at IS NOT NULL
GROUP BY sc.business_id, sci.category, sci.completed_by, p.full_name, date(sci.completed_at)
ORDER BY date(sci.completed_at) DESC, sci.category;

-- 3. Recreate time_by_job_report with SECURITY INVOKER
CREATE VIEW public.time_by_job_report WITH (security_invoker = true) AS
SELECT j.id AS job_id,
    j.title AS job_title,
    j.business_id,
    count(DISTINCT te.id) AS total_entries,
    sum(CASE WHEN te.clock_out_time IS NOT NULL THEN (EXTRACT(epoch FROM (te.clock_out_time - te.clock_in_time)) / 60::numeric) ELSE 0::numeric END) AS total_minutes,
    count(DISTINCT te.user_id) AS unique_workers
FROM jobs j
LEFT JOIN timesheet_entries te ON te.job_id = j.id
GROUP BY j.id, j.title, j.business_id;

-- 4. Recreate time_by_task_report with SECURITY INVOKER
CREATE VIEW public.time_by_task_report WITH (security_invoker = true) AS
SELECT sci.id AS item_id,
    sci.title AS item_title,
    sc.id AS checklist_id,
    sc.title AS checklist_title,
    sc.job_id,
    j.title AS job_title,
    j.business_id,
    sci.time_spent_minutes,
    sci.completed_by,
    sci.completed_at,
    p.full_name AS completed_by_name
FROM sg_checklist_items sci
JOIN sg_checklists sc ON sc.id = sci.checklist_id
JOIN jobs j ON j.id = sc.job_id
LEFT JOIN profiles p ON p.id = sci.completed_by
WHERE sci.is_completed = true AND sci.time_spent_minutes IS NOT NULL;

-- 5. Recreate unified_assignments with SECURITY INVOKER
CREATE VIEW public.unified_assignments WITH (security_invoker = true) AS
SELECT 'job'::text AS assignment_type,
    ja.job_id,
    ja.user_id,
    ja.assigned_at,
    NULL::uuid AS checklist_id,
    NULL::uuid AS item_id,
    j.business_id,
    j.title AS job_title,
    NULL::text AS item_title
FROM job_assignments ja
JOIN jobs j ON j.id = ja.job_id
UNION ALL
SELECT 'checklist_item'::text AS assignment_type,
    sc.job_id,
    sci.assigned_to AS user_id,
    sci.created_at AS assigned_at,
    sc.id AS checklist_id,
    sci.id AS item_id,
    sc.business_id,
    j.title AS job_title,
    sci.title AS item_title
FROM sg_checklist_items sci
JOIN sg_checklists sc ON sc.id = sci.checklist_id
JOIN jobs j ON j.id = sc.job_id
WHERE sci.assigned_to IS NOT NULL;

-- 6. Recreate user_productivity_report with SECURITY INVOKER
CREATE VIEW public.user_productivity_report WITH (security_invoker = true) AS
SELECT p.id AS user_id,
    p.full_name,
    bp.business_id,
    count(DISTINCT sci.id) AS tasks_completed,
    sum(sci.time_spent_minutes) AS task_minutes,
    count(DISTINCT te.id) AS timesheet_entries,
    sum(CASE WHEN te.clock_out_time IS NOT NULL THEN (EXTRACT(epoch FROM (te.clock_out_time - te.clock_in_time)) / 60::numeric) ELSE 0::numeric END) AS timesheet_minutes,
    CASE WHEN sum(CASE WHEN te.clock_out_time IS NOT NULL THEN (EXTRACT(epoch FROM (te.clock_out_time - te.clock_in_time)) / 60::numeric) ELSE 0::numeric END) > 0 
         THEN round((sum(sci.time_spent_minutes) / sum(CASE WHEN te.clock_out_time IS NOT NULL THEN (EXTRACT(epoch FROM (te.clock_out_time - te.clock_in_time)) / 60::numeric) ELSE 0::numeric END) * 100)::numeric, 2)
         ELSE 0::numeric 
    END AS productivity_percentage
FROM profiles p
JOIN business_permissions bp ON bp.user_id = p.id
LEFT JOIN timesheet_entries te ON te.user_id = p.id AND te.business_id = bp.business_id
LEFT JOIN sg_checklist_items sci ON sci.completed_by = p.id AND sci.is_completed = true
GROUP BY p.id, p.full_name, bp.business_id;

-- 7. Recreate weekly_time_breakdown with SECURITY INVOKER
CREATE VIEW public.weekly_time_breakdown WITH (security_invoker = true) AS
SELECT te.business_id,
    te.user_id,
    p.full_name AS user_name,
    date_trunc('week'::text, te.clock_in_time) AS week_start,
    count(DISTINCT date(te.clock_in_time)) AS days_worked,
    sum(CASE WHEN te.clock_out_time IS NOT NULL THEN (EXTRACT(epoch FROM (te.clock_out_time - te.clock_in_time)) / 60::numeric) ELSE 0::numeric END) AS total_minutes,
    count(DISTINCT te.job_id) AS jobs_worked,
    count(DISTINCT sci.id) AS tasks_completed
FROM timesheet_entries te
LEFT JOIN profiles p ON p.id = te.user_id
LEFT JOIN sg_checklist_items sci ON sci.timesheet_entry_id = te.id AND sci.is_completed = true
WHERE te.clock_in_time IS NOT NULL
GROUP BY te.business_id, te.user_id, p.full_name, date_trunc('week'::text, te.clock_in_time)
ORDER BY date_trunc('week'::text, te.clock_in_time) DESC, p.full_name;

-- Grant SELECT permissions to authenticated users
GRANT SELECT ON public.daily_time_breakdown TO authenticated;
GRANT SELECT ON public.task_category_breakdown TO authenticated;
GRANT SELECT ON public.time_by_job_report TO authenticated;
GRANT SELECT ON public.time_by_task_report TO authenticated;
GRANT SELECT ON public.unified_assignments TO authenticated;
GRANT SELECT ON public.user_productivity_report TO authenticated;
GRANT SELECT ON public.weekly_time_breakdown TO authenticated;