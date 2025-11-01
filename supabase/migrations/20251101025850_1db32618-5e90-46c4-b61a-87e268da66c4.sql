-- Track AI suggestion outcomes in jobs table
ALTER TABLE jobs 
  ADD COLUMN ai_suggestion_accepted BOOLEAN DEFAULT NULL,
  ADD COLUMN ai_suggestion_rejected_reason TEXT DEFAULT NULL;

-- Index for AI analytics queries
CREATE INDEX idx_jobs_ai_analytics ON jobs(business_id, created_at, ai_suggested, ai_suggestion_accepted)
  WHERE ai_suggested = true;

-- Index for efficiency analytics
CREATE INDEX idx_jobs_efficiency_analytics ON jobs(business_id, status, starts_at, ends_at)
  WHERE status IN ('Completed', 'In Progress');