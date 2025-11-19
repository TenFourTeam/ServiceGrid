-- Phase 3: Add feedback and business AI settings columns

-- Add feedback columns to sg_ai_generations
ALTER TABLE public.sg_ai_generations
ADD COLUMN feedback_rating integer CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
ADD COLUMN feedback_text text,
ADD COLUMN was_edited boolean DEFAULT false,
ADD COLUMN final_version jsonb;

COMMENT ON COLUMN public.sg_ai_generations.feedback_rating IS 'User rating of AI output (1-5 stars)';
COMMENT ON COLUMN public.sg_ai_generations.feedback_text IS 'Optional user feedback text';
COMMENT ON COLUMN public.sg_ai_generations.was_edited IS 'Whether user modified the AI output';
COMMENT ON COLUMN public.sg_ai_generations.final_version IS 'What user actually saved after editing';

-- Add AI settings to businesses table
ALTER TABLE public.businesses
ADD COLUMN ai_vision_enabled boolean DEFAULT true,
ADD COLUMN ai_monthly_credit_limit integer,
ADD COLUMN ai_credits_used_this_month integer DEFAULT 0;

COMMENT ON COLUMN public.businesses.ai_vision_enabled IS 'Whether AI Vision features are enabled for this business';
COMMENT ON COLUMN public.businesses.ai_monthly_credit_limit IS 'Monthly AI credit limit (null = unlimited)';
COMMENT ON COLUMN public.businesses.ai_credits_used_this_month IS 'Credits consumed this month';

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_sg_ai_generations_business_created 
ON public.sg_ai_generations(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sg_ai_generations_type_created 
ON public.sg_ai_generations(generation_type, created_at DESC);

-- Create function to reset monthly AI credits (to be called by cron job)
CREATE OR REPLACE FUNCTION reset_monthly_ai_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE businesses
  SET ai_credits_used_this_month = 0
  WHERE ai_credits_used_this_month > 0;
END;
$$;