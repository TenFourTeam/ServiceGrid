-- Drop storage RLS policies that reference clerk
DROP POLICY IF EXISTS "Business members can upload to job-media" ON storage.objects;
DROP POLICY IF EXISTS "Business members can delete from job-media" ON storage.objects;

-- Create new storage policies using session auth via business_permissions
CREATE POLICY "Business members can upload to job-media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'job-media' AND EXISTS (
    SELECT 1 FROM public.business_permissions bp
    JOIN public.business_sessions bs ON bs.profile_id = bp.user_id
    WHERE bs.expires_at > now()
  )
);

CREATE POLICY "Business members can delete from job-media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'job-media' AND EXISTS (
    SELECT 1 FROM public.business_permissions bp
    JOIN public.business_sessions bs ON bs.profile_id = bp.user_id
    WHERE bs.expires_at > now()
  )
);

-- Drop the clerk function
DROP FUNCTION IF EXISTS public.current_clerk_user_id();

-- Drop clerk columns from tables
ALTER TABLE public.profiles DROP COLUMN IF EXISTS clerk_user_id;
ALTER TABLE public.businesses DROP COLUMN IF EXISTS clerk_org_id;
ALTER TABLE public.customer_accounts DROP COLUMN IF EXISTS clerk_user_id;