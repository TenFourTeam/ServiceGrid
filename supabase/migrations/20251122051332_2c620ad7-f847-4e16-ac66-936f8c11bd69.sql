-- Add infographic_url column to service_catalog
ALTER TABLE public.service_catalog 
ADD COLUMN infographic_url TEXT NULL;

COMMENT ON COLUMN public.service_catalog.infographic_url IS 'URL of AI-generated process infographic for this SOP';

-- Create storage bucket for SOP infographics
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sop-infographics',
  'sop-infographics',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for sop-infographics bucket
CREATE POLICY "Public read access for sop-infographics"
ON storage.objects FOR SELECT
USING (bucket_id = 'sop-infographics');

CREATE POLICY "Authenticated users can upload sop-infographics"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sop-infographics' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their business sop-infographics"
ON storage.objects FOR UPDATE
USING (bucket_id = 'sop-infographics' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their business sop-infographics"
ON storage.objects FOR DELETE
USING (bucket_id = 'sop-infographics' AND auth.role() = 'authenticated');