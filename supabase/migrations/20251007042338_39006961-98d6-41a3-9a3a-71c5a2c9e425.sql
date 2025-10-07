-- Remove confirmation_status column since job status will handle everything
-- Keep confirmation_token and confirmed_at for tracking
ALTER TABLE jobs DROP COLUMN IF EXISTS confirmation_status;