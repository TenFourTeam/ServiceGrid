-- Remove the uses_clerk_orgs column from businesses table
-- This column is no longer needed as we're always using Clerk organizations
ALTER TABLE public.businesses DROP COLUMN uses_clerk_orgs;

-- Set default value for clerk_org_id to ensure new businesses always have one
-- (This will be populated by the webhook when creating new businesses)
ALTER TABLE public.businesses ALTER COLUMN clerk_org_id SET DEFAULT NULL;

-- Add comment to clarify that all businesses now use Clerk organizations
COMMENT ON TABLE public.businesses IS 'All businesses now use Clerk organizations by default';
COMMENT ON COLUMN public.businesses.clerk_org_id IS 'Clerk organization ID - required for all businesses';