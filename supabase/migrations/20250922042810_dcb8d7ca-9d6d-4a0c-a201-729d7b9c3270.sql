-- Create function to check if user can access customer contact information
CREATE OR REPLACE FUNCTION public.can_access_customer_contact_info(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT bm.role FROM public.business_members bm
     JOIN public.profiles p ON p.id = bm.user_id
     WHERE bm.business_id = p_business_id 
     AND p.clerk_user_id = public.current_clerk_user_id()) = 'owner',
    false
  );
$$;

-- Create a view for customers that conditionally shows contact information
CREATE OR REPLACE VIEW public.customers_with_conditional_contact AS
SELECT 
  c.id,
  c.owner_id,
  c.business_id,
  c.name,
  c.address,
  c.notes,
  c.created_at,
  c.updated_at,
  -- Only show email and phone if user can access contact info
  CASE 
    WHEN public.can_access_customer_contact_info(c.business_id) THEN c.email
    ELSE NULL
  END as email,
  CASE 
    WHEN public.can_access_customer_contact_info(c.business_id) THEN c.phone
    ELSE NULL
  END as phone
FROM public.customers c;

-- Enable RLS on the view
ALTER VIEW public.customers_with_conditional_contact SET (security_barrier = true);

-- Grant access to the view
GRANT SELECT ON public.customers_with_conditional_contact TO authenticated;