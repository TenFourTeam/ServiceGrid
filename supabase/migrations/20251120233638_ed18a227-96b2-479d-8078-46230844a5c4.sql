-- Google Drive Integration Tables

-- Google Drive connections per business
CREATE TABLE google_drive_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  google_account_email TEXT NOT NULL,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  root_folder_id TEXT, -- Main ServiceGrid folder in Drive
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- File mappings between ServiceGrid and Google Drive
CREATE TABLE google_drive_file_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES google_drive_connections(id) ON DELETE CASCADE,
  sg_entity_type TEXT NOT NULL, -- 'media', 'invoice', 'quote', 'job', 'customer'
  sg_entity_id UUID NOT NULL,
  drive_file_id TEXT NOT NULL,
  drive_file_name TEXT NOT NULL,
  drive_folder_id TEXT,
  drive_web_view_link TEXT,
  drive_web_content_link TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending', 'error', 'deleted'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, sg_entity_type, sg_entity_id, drive_file_id)
);

-- Sync activity log
CREATE TABLE google_drive_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES google_drive_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'media_backup', 'document_export', 'import', 'share'
  entity_type TEXT NOT NULL,
  entity_id UUID,
  direction TEXT NOT NULL, -- 'to_drive', 'from_drive'
  status TEXT NOT NULL, -- 'success', 'error', 'partial'
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_drive_connections_business ON google_drive_connections(business_id);
CREATE INDEX idx_drive_file_mappings_business ON google_drive_file_mappings(business_id);
CREATE INDEX idx_drive_file_mappings_entity ON google_drive_file_mappings(sg_entity_type, sg_entity_id);
CREATE INDEX idx_drive_file_mappings_drive_file ON google_drive_file_mappings(drive_file_id);
CREATE INDEX idx_drive_sync_log_business ON google_drive_sync_log(business_id);
CREATE INDEX idx_drive_sync_log_entity ON google_drive_sync_log(entity_type, entity_id);

-- RLS Policies
ALTER TABLE google_drive_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_drive_file_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_drive_sync_log ENABLE ROW LEVEL SECURITY;

-- Business members can view their Drive connections
CREATE POLICY "Business members can view Drive connections"
  ON google_drive_connections FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM business_permissions 
    WHERE user_id = auth.uid()
  ));

-- Business owners can manage Drive connections
CREATE POLICY "Business owners can manage Drive connections"
  ON google_drive_connections FOR ALL
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

-- Business members can view file mappings
CREATE POLICY "Business members can view file mappings"
  ON google_drive_file_mappings FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM business_permissions 
    WHERE user_id = auth.uid()
  ));

-- Service role can manage file mappings
CREATE POLICY "Service role can manage file mappings"
  ON google_drive_file_mappings FOR ALL
  USING (true);

-- Business members can view sync logs
CREATE POLICY "Business members can view sync logs"
  ON google_drive_sync_log FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM business_permissions 
    WHERE user_id = auth.uid()
  ));

-- Service role can manage sync logs
CREATE POLICY "Service role can manage sync logs"
  ON google_drive_sync_log FOR ALL
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_google_drive_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_drive_connections_updated_at
  BEFORE UPDATE ON google_drive_connections
  FOR EACH ROW EXECUTE FUNCTION update_google_drive_updated_at();

CREATE TRIGGER update_drive_file_mappings_updated_at
  BEFORE UPDATE ON google_drive_file_mappings
  FOR EACH ROW EXECUTE FUNCTION update_google_drive_updated_at();