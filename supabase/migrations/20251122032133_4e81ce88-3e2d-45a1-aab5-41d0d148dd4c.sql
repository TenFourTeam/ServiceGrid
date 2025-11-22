-- Add generation_metadata column to sg_media for AI visualization tracking
ALTER TABLE public.sg_media
ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT NULL;

COMMENT ON COLUMN public.sg_media.generation_metadata IS 'Tracks AI generation details: source_media_id, prompt, style, model, variation_number';

-- Create index on generation_metadata for efficient querying
CREATE INDEX IF NOT EXISTS idx_sg_media_generation_metadata 
ON public.sg_media USING GIN (generation_metadata);

-- Create index on source media lookups (stored in generation_metadata)
CREATE INDEX IF NOT EXISTS idx_sg_media_generation_source 
ON public.sg_media ((generation_metadata->>'source_media_id'));

-- Create storage bucket for visualizations if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('visualizations', 'visualizations', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for visualizations bucket
CREATE POLICY "Business members can view visualizations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'visualizations' AND
  EXISTS (
    SELECT 1 FROM sg_media
    WHERE storage_path = storage.objects.name
    AND business_id IN (
      SELECT business_id FROM business_permissions 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Business members can upload visualizations"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'visualizations' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Business members can update visualizations"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'visualizations' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Business members can delete visualizations"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visualizations' AND
  EXISTS (
    SELECT 1 FROM sg_media
    WHERE storage_path = storage.objects.name
    AND business_id IN (
      SELECT business_id FROM business_permissions 
      WHERE user_id = auth.uid()
    )
  )
);