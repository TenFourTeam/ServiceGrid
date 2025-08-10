-- 1) Add photos column to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Create a public storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
SELECT 'job-photos', 'job-photos', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'job-photos'
);

-- 3) Storage policies for job-photos bucket
-- Public read
CREATE POLICY IF NOT EXISTS "Public can read job photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'job-photos');

-- Public upload (note: using anon key client; restrict to bucket only)
CREATE POLICY IF NOT EXISTS "Anyone can upload job photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'job-photos');

-- Allow updates to uploaded photos (e.g., replacing images) by anyone (bucket-scoped)
CREATE POLICY IF NOT EXISTS "Anyone can update job photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'job-photos')
WITH CHECK (bucket_id = 'job-photos');