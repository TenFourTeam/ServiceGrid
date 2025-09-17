-- Add 'Assessed' to request_status enum
ALTER TYPE request_status ADD VALUE 'Assessed';

-- Add columns to jobs table for assessment functionality
ALTER TABLE public.jobs 
ADD COLUMN is_assessment BOOLEAN DEFAULT FALSE,
ADD COLUMN request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL;

-- Create function to auto-update request status when assessment job completes
CREATE OR REPLACE FUNCTION public.update_request_on_assessment_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if this is an assessment job that was just completed
  IF NEW.is_assessment = TRUE AND NEW.status = 'Completed' AND OLD.status != 'Completed' AND NEW.request_id IS NOT NULL THEN
    UPDATE public.requests 
    SET status = 'Assessed', updated_at = now()
    WHERE id = NEW.request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on jobs table
CREATE TRIGGER trigger_update_request_on_assessment_completion
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_request_on_assessment_completion();