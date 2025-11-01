-- Phase 4: Add time window columns to recurring_job_templates
ALTER TABLE recurring_job_templates
ADD COLUMN preferred_time_start TIME,
ADD COLUMN preferred_time_end TIME,
ADD COLUMN territory_id TEXT,
ADD COLUMN territory_name TEXT;

-- Add comment explaining time windows
COMMENT ON COLUMN recurring_job_templates.preferred_time_start IS 'Preferred start time for jobs generated from this template';
COMMENT ON COLUMN recurring_job_templates.preferred_time_end IS 'Preferred end time for jobs generated from this template';
COMMENT ON COLUMN recurring_job_templates.territory_id IS 'Auto-assigned territory identifier for clustering';
COMMENT ON COLUMN recurring_job_templates.territory_name IS 'Human-readable territory name (e.g., North Zone, Downtown)';