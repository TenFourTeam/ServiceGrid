-- Create sg_media table for photo and video storage
CREATE TABLE public.sg_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- File metadata
  file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video')),
  mime_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_hash TEXT,
  
  -- Storage paths and URLs
  storage_path TEXT NOT NULL,
  public_url TEXT,
  thumbnail_url TEXT,
  hls_manifest_url TEXT,
  
  -- EXIF and GPS metadata (stored as JSONB)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Upload tracking
  upload_status TEXT NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'processing', 'completed', 'failed')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_sg_media_job_id ON public.sg_media(job_id);
CREATE INDEX idx_sg_media_business_id ON public.sg_media(business_id);
CREATE INDEX idx_sg_media_content_hash ON public.sg_media(content_hash);
CREATE INDEX idx_sg_media_upload_status ON public.sg_media(upload_status);

-- Add trigger for updated_at
CREATE TRIGGER update_sg_media_updated_at
  BEFORE UPDATE ON public.sg_media
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.sg_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sg_media table
CREATE POLICY "Business members can view media"
  ON public.sg_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sg_media.job_id 
      AND is_business_member(j.business_id)
    )
  );

CREATE POLICY "Business members can insert media"
  ON public.sg_media
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sg_media.job_id 
      AND is_business_member(j.business_id)
    )
  );

CREATE POLICY "Business members can update media"
  ON public.sg_media
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sg_media.job_id 
      AND is_business_member(j.business_id)
    )
  );

CREATE POLICY "Business owners can delete media"
  ON public.sg_media
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = sg_media.job_id 
      AND can_manage_business(j.business_id)
    )
  );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('job-media', 'job-media', true, 104857600, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm']),
  ('job-media-thumbnails', 'job-media-thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('job-media-hls', 'job-media-hls', true, 524288000, ARRAY['application/vnd.apple.mpegurl', 'video/mp2t']);

-- RLS Policies for job-media bucket
CREATE POLICY "Business members can upload to job-media"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'job-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.clerk_user_id = current_clerk_user_id()
    )
  );

CREATE POLICY "Anyone can view job-media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'job-media');

CREATE POLICY "Business members can delete from job-media"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'job-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.clerk_user_id = current_clerk_user_id()
    )
  );

-- RLS Policies for job-media-thumbnails bucket
CREATE POLICY "Service role can insert thumbnails"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'job-media-thumbnails');

CREATE POLICY "Anyone can view thumbnails"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'job-media-thumbnails');

-- RLS Policies for job-media-hls bucket
CREATE POLICY "Service role can insert HLS files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'job-media-hls');

CREATE POLICY "Anyone can view HLS files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'job-media-hls');