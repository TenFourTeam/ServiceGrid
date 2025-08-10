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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can read job photos'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read job photos" ON storage.objects FOR SELECT USING (bucket_id = ''job-photos'')';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can upload job photos'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can upload job photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''job-photos'')';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can update job photos'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can update job photos" ON storage.objects FOR UPDATE USING (bucket_id = ''job-photos'') WITH CHECK (bucket_id = ''job-photos'')';
  END IF;
END $$;