-- Add photos column to requests table
ALTER TABLE public.requests 
ADD COLUMN photos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create request photos storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('request-photos', 'request-photos', true);

-- Allow business members to upload request photos
CREATE POLICY "Business members can upload request photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'request-photos' 
  AND EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id::text = (storage.foldername(name))[1]
    AND public.is_business_member(r.business_id)
  )
);

-- Allow business members to view request photos  
CREATE POLICY "Business members can view request photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'request-photos'
  AND EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id::text = (storage.foldername(name))[1] 
    AND public.is_business_member(r.business_id)
  )
);

-- Allow public access to request photos for public forms
CREATE POLICY "Public can upload request photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'request-photos'
);

-- Allow public to view request photos
CREATE POLICY "Public can view request photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'request-photos'
);