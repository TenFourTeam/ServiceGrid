-- Phase 1: Create checklist system tables

-- 1.1 Checklist Templates Table
CREATE TABLE sg_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_system_template BOOLEAN DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false,
  
  CONSTRAINT sg_checklist_templates_name_version_unique UNIQUE(business_id, name, version)
);

CREATE INDEX idx_sg_checklist_templates_business_id ON sg_checklist_templates(business_id);
CREATE INDEX idx_sg_checklist_templates_category ON sg_checklist_templates(category);

-- 1.2 Checklist Template Items Table
CREATE TABLE sg_checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES sg_checklist_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  required_photo_count INTEGER DEFAULT 0,
  estimated_duration_minutes INTEGER,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sg_checklist_template_items_template_id ON sg_checklist_template_items(template_id);

-- 1.3 Checklist Instances Table
CREATE TABLE sg_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  template_id UUID REFERENCES sg_checklist_templates(id),
  title TEXT NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT sg_checklists_job_id_unique UNIQUE(job_id)
);

CREATE INDEX idx_sg_checklists_job_id ON sg_checklists(job_id);
CREATE INDEX idx_sg_checklists_business_id ON sg_checklists(business_id);
CREATE INDEX idx_sg_checklists_assigned_to ON sg_checklists(assigned_to);
CREATE INDEX idx_sg_checklists_completed_at ON sg_checklists(completed_at);

-- 1.4 Checklist Items Table
CREATE TABLE sg_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES sg_checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  required_photo_count INTEGER DEFAULT 0,
  estimated_duration_minutes INTEGER,
  category TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sg_checklist_items_checklist_id ON sg_checklist_items(checklist_id);
CREATE INDEX idx_sg_checklist_items_assigned_to ON sg_checklist_items(assigned_to);
CREATE INDEX idx_sg_checklist_items_is_completed ON sg_checklist_items(is_completed);

-- 1.5 Link sg_media to checklist items
ALTER TABLE sg_media ADD COLUMN checklist_item_id UUID REFERENCES sg_checklist_items(id) ON DELETE CASCADE;
CREATE INDEX idx_sg_media_checklist_item_id ON sg_media(checklist_item_id);

-- 1.6 Checklist Events Table (audit trail)
CREATE TABLE sg_checklist_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES sg_checklists(id) ON DELETE CASCADE,
  item_id UUID REFERENCES sg_checklist_items(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sg_checklist_events_checklist_id ON sg_checklist_events(checklist_id);
CREATE INDEX idx_sg_checklist_events_event_type ON sg_checklist_events(event_type);
CREATE INDEX idx_sg_checklist_events_created_at ON sg_checklist_events(created_at DESC);

-- 1.7 Row-Level Security Policies

-- Enable RLS
ALTER TABLE sg_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sg_checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sg_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sg_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sg_checklist_events ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Business members can view templates"
ON sg_checklist_templates FOR SELECT
USING (is_business_member(business_id) OR is_system_template = true);

CREATE POLICY "Business owners can manage templates"
ON sg_checklist_templates FOR ALL
USING (can_manage_business(business_id));

-- Template items policies
CREATE POLICY "Business members can view template items"
ON sg_checklist_template_items FOR SELECT
USING (
  template_id IN (
    SELECT id FROM sg_checklist_templates 
    WHERE is_business_member(business_id) OR is_system_template = true
  )
);

CREATE POLICY "Business owners can manage template items"
ON sg_checklist_template_items FOR ALL
USING (
  template_id IN (
    SELECT id FROM sg_checklist_templates WHERE can_manage_business(business_id)
  )
);

-- Checklists policies
CREATE POLICY "Business members can view checklists"
ON sg_checklists FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Business members can create checklists"
ON sg_checklists FOR INSERT
WITH CHECK (is_business_member(business_id));

CREATE POLICY "Business members can update checklists"
ON sg_checklists FOR UPDATE
USING (is_business_member(business_id));

CREATE POLICY "Business owners can delete checklists"
ON sg_checklists FOR DELETE
USING (can_manage_business(business_id));

-- Checklist items policies
CREATE POLICY "Business members can manage checklist items"
ON sg_checklist_items FOR ALL
USING (
  checklist_id IN (
    SELECT id FROM sg_checklists WHERE is_business_member(business_id)
  )
);

-- Events policies
CREATE POLICY "Business members can view checklist events"
ON sg_checklist_events FOR SELECT
USING (
  checklist_id IN (
    SELECT id FROM sg_checklists WHERE is_business_member(business_id)
  )
);

CREATE POLICY "Service role can manage checklist events"
ON sg_checklist_events FOR ALL
USING (true);

-- 1.8 Auto-update checklist completion trigger
CREATE OR REPLACE FUNCTION update_checklist_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_items INTEGER;
  completed_items INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed = true)
  INTO total_items, completed_items
  FROM sg_checklist_items
  WHERE checklist_id = NEW.checklist_id;
  
  IF completed_items = total_items THEN
    UPDATE sg_checklists
    SET completed_at = NOW(), updated_at = NOW()
    WHERE id = NEW.checklist_id AND completed_at IS NULL;
  ELSE
    UPDATE sg_checklists
    SET completed_at = NULL, updated_at = NOW()
    WHERE id = NEW.checklist_id AND completed_at IS NOT NULL;
  END IF;
  
  IF NEW.is_completed = true THEN
    UPDATE sg_checklists
    SET started_at = NOW()
    WHERE id = NEW.checklist_id AND started_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_checklist_completion
AFTER UPDATE OF is_completed ON sg_checklist_items
FOR EACH ROW
EXECUTE FUNCTION update_checklist_completion();

-- 1.9 Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sg_checklists;
ALTER PUBLICATION supabase_realtime ADD TABLE sg_checklist_items;