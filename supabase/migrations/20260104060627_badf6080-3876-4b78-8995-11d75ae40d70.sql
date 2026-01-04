-- =====================================================
-- Google Maps Features Schema
-- =====================================================

-- 1. Geocode Cache Table
-- Dedicated geocoding storage with place IDs and expiry
CREATE TABLE IF NOT EXISTS geocode_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL UNIQUE,
  formatted_address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  place_id TEXT,
  accuracy TEXT,
  cached_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Geocode cache indexes
CREATE INDEX IF NOT EXISTS idx_geocode_cache_address ON geocode_cache(address);
CREATE INDEX IF NOT EXISTS idx_geocode_cache_location ON geocode_cache USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_geocode_cache_expiry ON geocode_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_geocode_cache_place_id ON geocode_cache(place_id) WHERE place_id IS NOT NULL;

-- Geocode cache RLS
ALTER TABLE geocode_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage geocode cache" ON geocode_cache FOR ALL USING (true);

-- 2. Route Directions Cache Table
-- Cache calculated routes to reduce API calls
CREATE TABLE IF NOT EXISTS route_directions_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_hash TEXT NOT NULL UNIQUE,
  waypoints JSONB NOT NULL,
  optimize_waypoints BOOLEAN DEFAULT false,
  total_distance_meters INTEGER NOT NULL,
  total_duration_seconds INTEGER NOT NULL,
  overview_polyline TEXT NOT NULL,
  legs JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Route cache indexes
CREATE INDEX IF NOT EXISTS idx_route_cache_hash ON route_directions_cache(route_hash);
CREATE INDEX IF NOT EXISTS idx_route_cache_expiry ON route_directions_cache(expires_at);

-- Route cache RLS
ALTER TABLE route_directions_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage route cache" ON route_directions_cache FOR ALL USING (true);

-- 3. Service Territories Table
-- Store defined service areas for territory management
CREATE TABLE IF NOT EXISTS service_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  boundary GEOGRAPHY(POLYGON, 4326),
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_meters INTEGER,
  assigned_members UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Territory indexes
CREATE INDEX IF NOT EXISTS idx_territories_business ON service_territories(business_id);
CREATE INDEX IF NOT EXISTS idx_territories_boundary ON service_territories USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_territories_active ON service_territories(business_id, is_active) WHERE is_active = true;

-- Territory RLS
ALTER TABLE service_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business members can view territories" ON service_territories 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses b 
      WHERE b.id = service_territories.business_id 
      AND (b.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM business_permissions bp 
        WHERE bp.business_id = b.id AND bp.user_id = auth.uid()
      ))
    )
  );
CREATE POLICY "Business owners can manage territories" ON service_territories 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses b 
      WHERE b.id = service_territories.business_id 
      AND b.owner_id = auth.uid()
    )
  );

-- 4. Add Location Columns to Customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

-- Customer location indexes
CREATE INDEX IF NOT EXISTS idx_customers_coordinates ON customers(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 5. Add Location Columns to Recurring Job Templates
ALTER TABLE recurring_job_templates
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES service_territories(id) ON DELETE SET NULL;

-- Recurring template indexes
CREATE INDEX IF NOT EXISTS idx_recurring_templates_coordinates ON recurring_job_templates(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_templates_territory ON recurring_job_templates(territory_id) 
  WHERE territory_id IS NOT NULL;

-- 6. Spatial Query Functions

-- Find jobs within radius
CREATE OR REPLACE FUNCTION jobs_within_radius(
  p_business_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT,
  scheduled_start TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.address,
    j.latitude,
    j.longitude,
    j.status,
    j.starts_at as scheduled_start,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) as distance_meters
  FROM jobs j
  WHERE j.business_id = p_business_id
    AND j.latitude IS NOT NULL
    AND j.longitude IS NOT NULL
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Find jobs within polygon
CREATE OR REPLACE FUNCTION jobs_within_polygon(
  p_business_id UUID,
  p_polygon JSONB
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT,
  scheduled_start TIMESTAMPTZ
) AS $$
DECLARE
  polygon_wkt TEXT;
  first_point TEXT;
BEGIN
  -- Get first point to close the polygon
  SELECT (p_polygon->0->>'lng') || ' ' || (p_polygon->0->>'lat')
  INTO first_point;

  -- Convert JSON array to WKT polygon
  SELECT 'POLYGON((' || string_agg(
    (elem->>'lng') || ' ' || (elem->>'lat'), ','
  ) || ',' || first_point || '))'
  INTO polygon_wkt
  FROM jsonb_array_elements(p_polygon) elem;

  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.address,
    j.latitude,
    j.longitude,
    j.status,
    j.starts_at as scheduled_start
  FROM jobs j
  WHERE j.business_id = p_business_id
    AND j.latitude IS NOT NULL
    AND j.longitude IS NOT NULL
    AND ST_Within(
      ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326),
      ST_GeomFromText(polygon_wkt, 4326)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Find customers within territory
CREATE OR REPLACE FUNCTION customers_in_territory(
  p_business_id UUID,
  p_territory_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.address,
    c.latitude,
    c.longitude
  FROM customers c
  JOIN service_territories t ON t.id = p_territory_id
  WHERE c.business_id = p_business_id
    AND c.latitude IS NOT NULL
    AND c.longitude IS NOT NULL
    AND ST_Within(
      ST_SetSRID(ST_MakePoint(c.longitude, c.latitude), 4326),
      t.boundary::geometry
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Find customers within radius
CREATE OR REPLACE FUNCTION customers_within_radius(
  p_business_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.address,
    c.latitude,
    c.longitude,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(c.longitude, c.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) as distance_meters
  FROM customers c
  WHERE c.business_id = p_business_id
    AND c.latitude IS NOT NULL
    AND c.longitude IS NOT NULL
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(c.longitude, c.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Migrate existing geocode data from travel_time_cache
INSERT INTO geocode_cache (address, latitude, longitude, cached_at)
SELECT DISTINCT ON (origin_address)
  origin_address,
  origin_lat,
  origin_lng,
  cached_at
FROM travel_time_cache
WHERE origin_address IS NOT NULL 
  AND origin_lat IS NOT NULL 
  AND origin_lng IS NOT NULL
ON CONFLICT (address) DO NOTHING;

-- Also migrate destination addresses
INSERT INTO geocode_cache (address, latitude, longitude, cached_at)
SELECT DISTINCT ON (destination_address)
  destination_address,
  destination_lat,
  destination_lng,
  cached_at
FROM travel_time_cache
WHERE destination_address IS NOT NULL 
  AND destination_lat IS NOT NULL 
  AND destination_lng IS NOT NULL
ON CONFLICT (address) DO NOTHING;

-- 8. Updated at trigger for service_territories
CREATE OR REPLACE FUNCTION update_service_territories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_service_territories_updated_at ON service_territories;
CREATE TRIGGER update_service_territories_updated_at
  BEFORE UPDATE ON service_territories
  FOR EACH ROW
  EXECUTE FUNCTION update_service_territories_updated_at();