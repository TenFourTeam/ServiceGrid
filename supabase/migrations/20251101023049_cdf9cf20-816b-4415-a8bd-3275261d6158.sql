-- Add geocoding columns to travel_time_cache
ALTER TABLE travel_time_cache 
  ADD COLUMN IF NOT EXISTS origin_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS origin_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS destination_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS destination_lng DOUBLE PRECISION;

-- Create index for geocoding lookups
CREATE INDEX IF NOT EXISTS idx_travel_cache_geocode 
  ON travel_time_cache(origin_address) 
  WHERE origin_lat IS NOT NULL;

-- Add geocoded coordinates to jobs table
ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Index for map queries
CREATE INDEX IF NOT EXISTS idx_jobs_coordinates 
  ON jobs(latitude, longitude) 
  WHERE latitude IS NOT NULL;