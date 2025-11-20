-- QuickBooks Integration Schema

-- Table 1: QuickBooks Connections (OAuth tokens and connection status)
CREATE TABLE public.quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  realm_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id)
);

ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their QB connection"
  ON public.quickbooks_connections FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business owners can manage their QB connection"
  ON public.quickbooks_connections FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Table 2: QuickBooks Sync Log (Audit trail)
CREATE TABLE public.quickbooks_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quickbooks_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view sync logs"
  ON public.quickbooks_sync_log FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM business_permissions WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_sync_log_business_created ON public.quickbooks_sync_log(business_id, created_at DESC);

-- Table 3: QuickBooks Entity Mappings (ServiceGrid to QuickBooks ID mapping)
CREATE TABLE public.quickbooks_entity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sg_entity_type TEXT NOT NULL,
  sg_entity_id UUID NOT NULL,
  qb_entity_id TEXT NOT NULL,
  qb_sync_token TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, sg_entity_type, sg_entity_id)
);

ALTER TABLE public.quickbooks_entity_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view entity mappings"
  ON public.quickbooks_entity_mappings FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM business_permissions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Business owners can manage entity mappings"
  ON public.quickbooks_entity_mappings FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE INDEX idx_mappings_business_entity ON public.quickbooks_entity_mappings(business_id, sg_entity_type, sg_entity_id);