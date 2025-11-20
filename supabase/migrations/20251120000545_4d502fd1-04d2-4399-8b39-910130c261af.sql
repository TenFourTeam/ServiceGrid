-- Create changelog_entries table
CREATE TABLE public.changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  publish_date DATE NOT NULL,
  tag TEXT,
  reaction_counts JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create changelog_sections table
CREATE TABLE public.changelog_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.changelog_entries(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create changelog_items table
CREATE TABLE public.changelog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.changelog_sections(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelog_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelog_items ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public can view changelog entries"
  ON public.changelog_entries FOR SELECT
  USING (true);

CREATE POLICY "Public can view changelog sections"
  ON public.changelog_sections FOR SELECT
  USING (true);

CREATE POLICY "Public can view changelog items"
  ON public.changelog_items FOR SELECT
  USING (true);

-- Public insert policies
CREATE POLICY "Public can create changelog entries"
  ON public.changelog_entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can create changelog sections"
  ON public.changelog_sections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can create changelog items"
  ON public.changelog_items FOR INSERT
  WITH CHECK (true);

-- Public update policies
CREATE POLICY "Public can update changelog entries"
  ON public.changelog_entries FOR UPDATE
  USING (true);

CREATE POLICY "Public can update changelog sections"
  ON public.changelog_sections FOR UPDATE
  USING (true);

CREATE POLICY "Public can update changelog items"
  ON public.changelog_items FOR UPDATE
  USING (true);

-- Public delete policies
CREATE POLICY "Public can delete changelog entries"
  ON public.changelog_entries FOR DELETE
  USING (true);

CREATE POLICY "Public can delete changelog sections"
  ON public.changelog_sections FOR DELETE
  USING (true);

CREATE POLICY "Public can delete changelog items"
  ON public.changelog_items FOR DELETE
  USING (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_changelog_entry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_changelog_entry_updated_at
  BEFORE UPDATE ON public.changelog_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_changelog_entry_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_changelog_entries_publish_date ON public.changelog_entries(publish_date DESC);
CREATE INDEX idx_changelog_sections_entry_id ON public.changelog_sections(entry_id, sort_order);
CREATE INDEX idx_changelog_items_section_id ON public.changelog_items(section_id, sort_order);