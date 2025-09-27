-- Phase 1: Add accepted_at column to invites table to replace business_members tracking
ALTER TABLE public.invites 
ADD COLUMN accepted_at timestamp with time zone DEFAULT NULL;

-- Add index for performance on accepted invites queries
CREATE INDEX idx_invites_accepted_at ON public.invites (business_id, accepted_at) 
WHERE accepted_at IS NOT NULL;