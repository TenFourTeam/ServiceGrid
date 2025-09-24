-- Add Clerk Organizations overlay support to existing system
-- These changes are non-breaking and additive

-- Add Clerk organization tracking to businesses table
ALTER TABLE public.businesses 
ADD COLUMN clerk_org_id text UNIQUE,
ADD COLUMN uses_clerk_orgs boolean DEFAULT false;

-- Add signup context to invites for organization-aware worker signups
ALTER TABLE public.invites 
ADD COLUMN signup_context jsonb DEFAULT '{}';

-- Add index for faster lookups
CREATE INDEX idx_businesses_clerk_org_id ON public.businesses(clerk_org_id) WHERE clerk_org_id IS NOT NULL;