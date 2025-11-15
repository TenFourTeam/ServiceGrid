-- Create sg_pages table for collaborative notebooks
CREATE TABLE sg_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Page',
  content_json JSONB NOT NULL DEFAULT '{"type": "doc", "content": []}'::jsonb,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  icon TEXT,
  parent_page_id UUID REFERENCES sg_pages(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0
);

-- Create sg_page_versions for version history
CREATE TABLE sg_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES sg_pages(id) ON DELETE CASCADE,
  content_json JSONB NOT NULL,
  version_number INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_summary TEXT
);

-- Create sg_page_collaborators for editor access tracking
CREATE TABLE sg_page_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES sg_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  last_viewed_at TIMESTAMPTZ,
  last_edited_at TIMESTAMPTZ,
  cursor_position JSONB,
  is_viewing BOOLEAN DEFAULT false,
  UNIQUE(page_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_sg_pages_business ON sg_pages(business_id);
CREATE INDEX idx_sg_pages_job ON sg_pages(job_id);
CREATE INDEX idx_sg_pages_created_by ON sg_pages(created_by);
CREATE INDEX idx_sg_pages_parent ON sg_pages(parent_page_id);
CREATE INDEX idx_sg_page_versions_page ON sg_page_versions(page_id);
CREATE INDEX idx_sg_page_collaborators_page ON sg_page_collaborators(page_id);
CREATE INDEX idx_sg_page_collaborators_user ON sg_page_collaborators(user_id);

-- Enable RLS
ALTER TABLE sg_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sg_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sg_page_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sg_pages
CREATE POLICY "Business members can view pages"
  ON sg_pages FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY "Business members can create pages"
  ON sg_pages FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY "Business members can update pages"
  ON sg_pages FOR UPDATE
  USING (is_business_member(business_id));

CREATE POLICY "Business owners can delete pages"
  ON sg_pages FOR DELETE
  USING (can_manage_business(business_id));

-- RLS Policies for sg_page_versions
CREATE POLICY "Business members can view page versions"
  ON sg_page_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sg_pages p 
    WHERE p.id = sg_page_versions.page_id 
    AND is_business_member(p.business_id)
  ));

CREATE POLICY "Service role can manage page versions"
  ON sg_page_versions FOR ALL
  USING (true);

-- RLS Policies for sg_page_collaborators
CREATE POLICY "Business members can view collaborators"
  ON sg_page_collaborators FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sg_pages p 
    WHERE p.id = sg_page_collaborators.page_id 
    AND is_business_member(p.business_id)
  ));

CREATE POLICY "Users can update their own collaborator record"
  ON sg_page_collaborators FOR ALL
  USING (user_id = current_user_profile_id());

-- Enable Realtime for presence and collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE sg_pages;
ALTER PUBLICATION supabase_realtime ADD TABLE sg_page_collaborators;

-- Create update trigger for sg_pages
CREATE OR REPLACE FUNCTION update_sg_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sg_pages_updated_at
  BEFORE UPDATE ON sg_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_sg_pages_updated_at();

-- Add page_id to sg_media table
ALTER TABLE sg_media ADD COLUMN page_id UUID REFERENCES sg_pages(id) ON DELETE SET NULL;
CREATE INDEX idx_sg_media_page ON sg_media(page_id);