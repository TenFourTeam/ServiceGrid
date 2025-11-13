-- Add conversation_id to sg_media table
ALTER TABLE sg_media ADD COLUMN conversation_id UUID REFERENCES sg_conversations(id) ON DELETE CASCADE;
CREATE INDEX idx_sg_media_conversation_id ON sg_media(conversation_id);

-- Update RLS policies for sg_media to include conversation access
DROP POLICY IF EXISTS "Business members can insert media" ON sg_media;
DROP POLICY IF EXISTS "Business members can view media" ON sg_media;
DROP POLICY IF EXISTS "Business members can update media" ON sg_media;

CREATE POLICY "Business members can insert media" ON sg_media
FOR INSERT
WITH CHECK (
  (job_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = sg_media.job_id AND is_business_member(j.business_id)
  ))
  OR
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM sg_conversations c WHERE c.id = sg_media.conversation_id AND is_business_member(c.business_id)
  ))
);

CREATE POLICY "Business members can view media" ON sg_media
FOR SELECT
USING (
  (job_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = sg_media.job_id AND is_business_member(j.business_id)
  ))
  OR
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM sg_conversations c WHERE c.id = sg_media.conversation_id AND is_business_member(c.business_id)
  ))
);

CREATE POLICY "Business members can update media" ON sg_media
FOR UPDATE
USING (
  (job_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = sg_media.job_id AND is_business_member(j.business_id)
  ))
  OR
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM sg_conversations c WHERE c.id = sg_media.conversation_id AND is_business_member(c.business_id)
  ))
);

-- Create conversation-media storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('conversation-media', 'conversation-media', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for conversation-media bucket
CREATE POLICY "Business members can upload conversation media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'conversation-media' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT business_id FROM business_permissions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Business members can view conversation media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'conversation-media' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT business_id FROM business_permissions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Business members can delete conversation media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'conversation-media' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT business_id FROM business_permissions WHERE user_id = auth.uid()
  )
);