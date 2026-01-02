-- Create missing business_permissions for existing business owners
-- This fixes users who own businesses but don't have the corresponding permissions record
INSERT INTO public.business_permissions (business_id, user_id, granted_by)
SELECT b.id, b.owner_id, b.owner_id
FROM public.businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM public.business_permissions bp
    WHERE bp.business_id = b.id AND bp.user_id = b.owner_id
);