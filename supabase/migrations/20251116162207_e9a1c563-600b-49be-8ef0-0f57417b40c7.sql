-- Add performance index for media queries by job and creation date
CREATE INDEX IF NOT EXISTS idx_media_job_created ON sg_media(job_id, created_at DESC);

-- Add comment for documentation
COMMENT ON INDEX idx_media_job_created IS 'Optimizes media queries filtered by job_id and sorted by creation date';