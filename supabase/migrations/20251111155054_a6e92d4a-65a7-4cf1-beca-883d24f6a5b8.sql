-- Enable PostGIS extension for spatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column for spatial queries
ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Update existing records to populate geography from lat/lng
UPDATE jobs 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND location IS NULL;

-- Create spatial index (GiST) for fast radius queries
CREATE INDEX IF NOT EXISTS idx_jobs_location_gist 
  ON jobs USING GIST (location);

-- Create trigger function to auto-update geography when lat/lng changes
CREATE OR REPLACE FUNCTION sync_job_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-sync location
DROP TRIGGER IF EXISTS trg_sync_job_location ON jobs;
CREATE TRIGGER trg_sync_job_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION sync_job_location();

-- Function to query jobs within radius (meters)
CREATE OR REPLACE FUNCTION jobs_within_radius(
  p_business_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  status job_status,
  starts_at timestamptz,
  ends_at timestamptz,
  address text,
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  customer_name text,
  customer_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_center geography;
  v_user_role business_role;
BEGIN
  -- Create geography point for center
  v_center := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  
  -- Get user role if user_id provided
  IF p_user_id IS NOT NULL THEN
    v_user_role := user_business_role(p_business_id, p_user_id);
  END IF;
  
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.status,
    j.starts_at,
    j.ends_at,
    j.address,
    j.latitude,
    j.longitude,
    ST_Distance(j.location, v_center)::double precision as distance_meters,
    c.name as customer_name,
    j.customer_id
  FROM jobs j
  LEFT JOIN customers c ON c.id = j.customer_id
  WHERE j.business_id = p_business_id
    AND j.location IS NOT NULL
    AND ST_DWithin(j.location, v_center, p_radius_meters)
    -- Apply role-based filtering: owners see all, workers see only assigned jobs
    AND (
      v_user_role = 'owner' OR
      v_user_role IS NULL OR
      EXISTS (
        SELECT 1 FROM job_assignments 
        WHERE job_id = j.id AND user_id = p_user_id
      )
    )
  ORDER BY distance_meters ASC;
END;
$$;

-- Function to query jobs within polygon
CREATE OR REPLACE FUNCTION jobs_within_polygon(
  p_business_id uuid,
  p_polygon_coords jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  status job_status,
  starts_at timestamptz,
  ends_at timestamptz,
  address text,
  latitude double precision,
  longitude double precision,
  customer_name text,
  customer_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_polygon geography;
  v_wkt text;
  v_user_role business_role;
  v_coord jsonb;
  v_coords text[];
BEGIN
  -- Convert JSON coordinates to WKT polygon format
  -- Expected format: [{"lat": 37.7, "lng": -122.4}, ...]
  FOR v_coord IN SELECT jsonb_array_elements(p_polygon_coords)
  LOOP
    v_coords := array_append(v_coords, 
      (v_coord->>'lng') || ' ' || (v_coord->>'lat')
    );
  END LOOP;
  
  -- Close the polygon by adding first point at the end
  v_coords := array_append(v_coords, v_coords[1]);
  
  v_wkt := 'POLYGON((' || array_to_string(v_coords, ',') || '))';
  v_polygon := ST_GeogFromText(v_wkt);
  
  -- Get user role if user_id provided
  IF p_user_id IS NOT NULL THEN
    v_user_role := user_business_role(p_business_id, p_user_id);
  END IF;
  
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.status,
    j.starts_at,
    j.ends_at,
    j.address,
    j.latitude,
    j.longitude,
    c.name as customer_name,
    j.customer_id
  FROM jobs j
  LEFT JOIN customers c ON c.id = j.customer_id
  WHERE j.business_id = p_business_id
    AND j.location IS NOT NULL
    AND ST_Covers(v_polygon, j.location)
    -- Apply role-based filtering
    AND (
      v_user_role = 'owner' OR
      v_user_role IS NULL OR
      EXISTS (
        SELECT 1 FROM job_assignments 
        WHERE job_id = j.id AND user_id = p_user_id
      )
    );
END;
$$;