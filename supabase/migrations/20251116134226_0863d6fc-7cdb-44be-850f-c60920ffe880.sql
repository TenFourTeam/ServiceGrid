-- Create sg_ai_artifacts table for AI-generated documentation
CREATE TABLE public.sg_ai_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('overview', 'team_summary', 'customer_summary')),
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  content_html TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  input_hash TEXT NOT NULL,
  provenance JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX idx_sg_ai_artifacts_business_id ON public.sg_ai_artifacts(business_id);
CREATE INDEX idx_sg_ai_artifacts_created_by ON public.sg_ai_artifacts(created_by);
CREATE INDEX idx_sg_ai_artifacts_input_hash ON public.sg_ai_artifacts(input_hash);

-- Enable RLS
ALTER TABLE public.sg_ai_artifacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sg_ai_artifacts
CREATE POLICY "Business members can read AI artifacts"
  ON public.sg_ai_artifacts
  FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY "Business members can create AI artifacts"
  ON public.sg_ai_artifacts
  FOR INSERT
  WITH CHECK (is_business_member(business_id) AND created_by = current_user_profile_id());

CREATE POLICY "Business owners can delete AI artifacts"
  ON public.sg_ai_artifacts
  FOR DELETE
  USING (can_manage_business(business_id));

-- Create sg_timeline_shares table for shareable timeline links
CREATE TABLE public.sg_timeline_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  filters_json JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0 NOT NULL,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  watermark_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_sg_timeline_shares_token ON public.sg_timeline_shares(token);
CREATE INDEX idx_sg_timeline_shares_business_id ON public.sg_timeline_shares(business_id);

-- Enable RLS
ALTER TABLE public.sg_timeline_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sg_timeline_shares
CREATE POLICY "Business members can manage timeline shares"
  ON public.sg_timeline_shares
  FOR ALL
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id) AND created_by = current_user_profile_id());

-- PUBLIC access policy for viewing shared timelines
CREATE POLICY "Public can view active timeline shares by token"
  ON public.sg_timeline_shares
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Create sg_documents table for document management
CREATE TABLE public.sg_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'agreement', 'quote', 'invoice', 'work_order', 'receipt', 'other')),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_sg_documents_business_id ON public.sg_documents(business_id);
CREATE INDEX idx_sg_documents_job_id ON public.sg_documents(job_id);
CREATE INDEX idx_sg_documents_customer_id ON public.sg_documents(customer_id);

-- Enable RLS
ALTER TABLE public.sg_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sg_documents
CREATE POLICY "Business members can read documents"
  ON public.sg_documents
  FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY "Business members can create documents"
  ON public.sg_documents
  FOR INSERT
  WITH CHECK (is_business_member(business_id) AND created_by = current_user_profile_id());

CREATE POLICY "Business members can update documents"
  ON public.sg_documents
  FOR UPDATE
  USING (is_business_member(business_id));

CREATE POLICY "Business owners can delete documents"
  ON public.sg_documents
  FOR DELETE
  USING (can_manage_business(business_id));

-- Create sg_esign_envelopes table for e-signature tracking
CREATE TABLE public.sg_esign_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.sg_documents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('docusign', 'signwell', 'simple')),
  provider_envelope_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'signed', 'completed', 'voided', 'declined')),
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  voided_at TIMESTAMP WITH TIME ZONE,
  signed_document_url TEXT,
  audit_trail JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_sg_esign_envelopes_business_id ON public.sg_esign_envelopes(business_id);
CREATE INDEX idx_sg_esign_envelopes_document_id ON public.sg_esign_envelopes(document_id);
CREATE INDEX idx_sg_esign_envelopes_provider_envelope_id ON public.sg_esign_envelopes(provider_envelope_id);
CREATE INDEX idx_sg_esign_envelopes_status ON public.sg_esign_envelopes(status);

-- Enable RLS
ALTER TABLE public.sg_esign_envelopes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sg_esign_envelopes
CREATE POLICY "Business members can read envelopes"
  ON public.sg_esign_envelopes
  FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY "Business members can create envelopes"
  ON public.sg_esign_envelopes
  FOR INSERT
  WITH CHECK (is_business_member(business_id) AND created_by = current_user_profile_id());

CREATE POLICY "Business members can update envelopes"
  ON public.sg_esign_envelopes
  FOR UPDATE
  USING (is_business_member(business_id));

CREATE POLICY "Service role can manage envelopes"
  ON public.sg_esign_envelopes
  FOR ALL
  USING (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all new tables
CREATE TRIGGER update_sg_ai_artifacts_updated_at
  BEFORE UPDATE ON public.sg_ai_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sg_timeline_shares_updated_at
  BEFORE UPDATE ON public.sg_timeline_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sg_documents_updated_at
  BEFORE UPDATE ON public.sg_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sg_esign_envelopes_updated_at
  BEFORE UPDATE ON public.sg_esign_envelopes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();