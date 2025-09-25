-- Add RLS policy to allow business owners to view all profiles for invitation purposes
CREATE POLICY "Business owners can view all profiles for invitations" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.business_members bm
    JOIN public.profiles p ON p.id = bm.user_id
    WHERE p.clerk_user_id = public.current_clerk_user_id()
    AND bm.role = 'owner'
  )
);