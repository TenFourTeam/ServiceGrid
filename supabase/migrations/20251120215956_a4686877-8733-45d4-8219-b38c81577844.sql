-- QuickBooks Integration: Extended Infrastructure Tables

-- Sync schedules for automation
CREATE TABLE IF NOT EXISTS quickbooks_sync_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  frequency_minutes INTEGER DEFAULT 60,
  direction TEXT DEFAULT 'bidirectional',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Field mappings for custom field configuration
CREATE TABLE IF NOT EXISTS quickbooks_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  sg_field TEXT NOT NULL,
  qb_field TEXT NOT NULL,
  transform_function TEXT,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, entity_type, sg_field)
);

-- Conflict resolution tracking
CREATE TABLE IF NOT EXISTS quickbooks_conflict_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  sg_data JSONB NOT NULL,
  qb_data JSONB NOT NULL,
  resolution TEXT CHECK (resolution IN ('sg', 'qb', 'merged')),
  resolved_data JSONB,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook events from QuickBooks
CREATE TABLE IF NOT EXISTS quickbooks_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  qb_entity_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qb_schedules_business ON quickbooks_sync_schedules(business_id);
CREATE INDEX IF NOT EXISTS idx_qb_schedules_next_run ON quickbooks_sync_schedules(next_run_at) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_qb_field_mappings_business ON quickbooks_field_mappings(business_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_qb_conflicts_business ON quickbooks_conflict_resolutions(business_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qb_webhooks_unprocessed ON quickbooks_webhook_events(business_id, processed) WHERE processed = false;

-- RLS Policies
ALTER TABLE quickbooks_sync_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_conflict_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_webhook_events ENABLE ROW LEVEL SECURITY;

-- Business members can view their sync schedules
CREATE POLICY "Business members can view sync schedules"
  ON quickbooks_sync_schedules FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM business_permissions WHERE user_id = auth.uid()
  ));

-- Business owners can manage sync schedules
CREATE POLICY "Business owners can manage sync schedules"
  ON quickbooks_sync_schedules FOR ALL
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

-- Business members can view field mappings
CREATE POLICY "Business members can view field mappings"
  ON quickbooks_field_mappings FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM business_permissions WHERE user_id = auth.uid()
  ));

-- Business owners can manage field mappings
CREATE POLICY "Business owners can manage field mappings"
  ON quickbooks_field_mappings FOR ALL
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

-- Business members can view conflicts
CREATE POLICY "Business members can view conflicts"
  ON quickbooks_conflict_resolutions FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM business_permissions WHERE user_id = auth.uid()
  ));

-- Business members can resolve conflicts
CREATE POLICY "Business members can resolve conflicts"
  ON quickbooks_conflict_resolutions FOR UPDATE
  USING (business_id IN (
    SELECT business_id FROM business_permissions WHERE user_id = auth.uid()
  ));

-- Webhook events are managed by service role only
CREATE POLICY "Service role can manage webhook events"
  ON quickbooks_webhook_events FOR ALL
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_quickbooks_sync_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quickbooks_sync_schedules_updated_at
  BEFORE UPDATE ON quickbooks_sync_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_sync_schedules_updated_at();