-- Create AI Activity Log table for tracking AI interactions
CREATE TABLE IF NOT EXISTS public.ai_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('suggestion', 'optimization', 'prediction', 'conflict_resolution', 'auto_schedule')),
  description TEXT NOT NULL,
  accepted BOOLEAN,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_activity_log_business_id ON public.ai_activity_log(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_activity_log_created_at ON public.ai_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_activity_log_activity_type ON public.ai_activity_log(activity_type);

-- Enable Row Level Security
ALTER TABLE public.ai_activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their business's AI activity logs"
ON public.ai_activity_log
FOR SELECT
USING (
  business_id IN (
    SELECT business_id 
    FROM public.business_permissions 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create AI activity logs for their business"
ON public.ai_activity_log
FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM public.business_permissions 
    WHERE user_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON TABLE public.ai_activity_log IS 'Tracks all AI-powered interactions including scheduling suggestions, optimizations, and predictions for analytics and user transparency';