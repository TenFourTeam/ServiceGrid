-- Ensure job_assignments table has proper foreign key constraints
-- and unique constraint for the upsert operation

-- First, drop existing table if it exists to recreate with proper constraints
DROP TABLE IF EXISTS public.job_assignments CASCADE;

-- Create job_assignments table with proper foreign keys
CREATE TABLE public.job_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicate assignments and enable upsert
  UNIQUE(job_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for job assignments
CREATE POLICY "Business members can read job assignments" 
ON public.job_assignments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_assignments.job_id 
    AND public.is_business_member(j.business_id)
  )
);

CREATE POLICY "Business owners can manage job assignments" 
ON public.job_assignments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_assignments.job_id 
    AND public.can_manage_business(j.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_assignments.job_id 
    AND public.can_manage_business(j.business_id)
  )
);

CREATE POLICY "Workers can read their own job assignments" 
ON public.job_assignments 
FOR SELECT 
USING (user_id = public.current_user_profile_id());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_job_assignments_updated_at
BEFORE UPDATE ON public.job_assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();