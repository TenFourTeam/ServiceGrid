-- Phase 1: Add scheduling-related fields to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preferred_time_window JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_suggested BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduling_score FLOAT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS optimized_order INTEGER;

-- Add comments for clarity
COMMENT ON COLUMN jobs.priority IS 'Job priority: 1=urgent, 5=low';
COMMENT ON COLUMN jobs.estimated_duration_minutes IS 'AI-estimated duration in minutes';
COMMENT ON COLUMN jobs.preferred_time_window IS 'Customer preferred time as {start: "09:00", end: "17:00"}';
COMMENT ON COLUMN jobs.ai_suggested IS 'Whether this scheduling was AI-suggested';
COMMENT ON COLUMN jobs.scheduling_score IS 'AI confidence score (0.0 - 1.0)';
COMMENT ON COLUMN jobs.optimized_order IS 'Order in optimized route for the day';

-- Create travel time cache table to minimize Google Maps API calls
CREATE TABLE IF NOT EXISTS travel_time_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  travel_time_minutes INTEGER NOT NULL,
  distance_miles FLOAT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  CONSTRAINT unique_addresses UNIQUE(origin_address, destination_address)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_travel_cache_addresses ON travel_time_cache(origin_address, destination_address);
CREATE INDEX IF NOT EXISTS idx_travel_cache_expiry ON travel_time_cache(expires_at);

-- RLS policies for travel cache
ALTER TABLE travel_time_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage travel cache"
  ON travel_time_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);