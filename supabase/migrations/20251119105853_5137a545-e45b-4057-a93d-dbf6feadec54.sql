-- Create sg_ai_generations table for AI audit trail
CREATE TABLE IF NOT EXISTS public.sg_ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('invoice_estimate', 'checklist_generation')),
  source_media_id UUID NOT NULL REFERENCES public.sg_media(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  input_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_sg_ai_generations_business_id ON public.sg_ai_generations(business_id);
CREATE INDEX idx_sg_ai_generations_user_id ON public.sg_ai_generations(user_id);
CREATE INDEX idx_sg_ai_generations_type ON public.sg_ai_generations(generation_type);
CREATE INDEX idx_sg_ai_generations_created_at ON public.sg_ai_generations(created_at DESC);

-- Enable RLS
ALTER TABLE public.sg_ai_generations ENABLE ROW LEVEL SECURITY;

-- Business members can read AI generations for their business
CREATE POLICY "Business members can read AI generations"
  ON public.sg_ai_generations
  FOR SELECT
  USING (is_business_member(business_id));

-- Business members can create AI generations for their business
CREATE POLICY "Business members can create AI generations"
  ON public.sg_ai_generations
  FOR INSERT
  WITH CHECK (
    is_business_member(business_id) 
    AND user_id = current_user_profile_id()
  );

-- Business owners can delete AI generations
CREATE POLICY "Business owners can delete AI generations"
  ON public.sg_ai_generations
  FOR DELETE
  USING (can_manage_business(business_id));