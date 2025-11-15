-- Add tags column to sg_media
ALTER TABLE sg_media ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_sg_media_tags ON sg_media USING GIN(tags);

-- Create sg_media_tags vocabulary table for controlled tags
CREATE TABLE IF NOT EXISTS public.sg_media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_color TEXT DEFAULT '#3B82F6',
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_sg_media_tags_business ON sg_media_tags(business_id);

-- RLS for tags vocabulary
ALTER TABLE sg_media_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view tags" ON sg_media_tags;
CREATE POLICY "Business members can view tags"
  ON sg_media_tags FOR SELECT
  USING (is_business_member(business_id));

DROP POLICY IF EXISTS "Business members can manage tags" ON sg_media_tags;
CREATE POLICY "Business members can manage tags"
  ON sg_media_tags FOR ALL
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));

-- Trigger to update usage_count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE sg_media_tags
    SET usage_count = (
      SELECT COUNT(*) FROM sg_media
      WHERE business_id = NEW.business_id
      AND tags && ARRAY[tag_name]
    )
    WHERE business_id = NEW.business_id
    AND tag_name = ANY(NEW.tags);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_media_tag_counts ON sg_media;
CREATE TRIGGER update_media_tag_counts
  AFTER INSERT OR UPDATE OF tags ON sg_media
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

-- Add annotation columns to sg_media
ALTER TABLE sg_media ADD COLUMN IF NOT EXISTS annotations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE sg_media ADD COLUMN IF NOT EXISTS has_annotations BOOLEAN DEFAULT false;
ALTER TABLE sg_media ADD COLUMN IF NOT EXISTS annotated_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_sg_media_annotations ON sg_media USING GIN(annotations);
CREATE INDEX IF NOT EXISTS idx_sg_media_has_annotations ON sg_media(has_annotations) WHERE has_annotations = true;