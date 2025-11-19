
-- Phase 1: Fix Security Issues - Fix mutable search path for existing functions only
ALTER FUNCTION update_checklist_completion() SET search_path = public;

-- Phase 4: Add Approval Workflow to Checklists

-- Add status column to sg_checklists
ALTER TABLE public.sg_checklists 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add check constraint for status
ALTER TABLE public.sg_checklists
ADD CONSTRAINT sg_checklists_status_check 
CHECK (status IN ('draft', 'active', 'completed', 'archived'));

-- Add approval tracking
ALTER TABLE public.sg_checklists
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_checklists_status ON public.sg_checklists(status);

-- Update existing checklists to have 'active' status
UPDATE public.sg_checklists SET status = 'active' WHERE status IS NULL;
