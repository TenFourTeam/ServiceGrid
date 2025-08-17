-- Fix infinite recursion in business_members RLS policies
-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Business owners can manage members" ON public.business_members;
DROP POLICY IF EXISTS "Business owners can view all members" ON public.business_members;

-- Create new non-recursive policies that use businesses.owner_id directly
CREATE POLICY "Business owners can view all members via ownership" 
ON public.business_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = business_members.business_id 
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can manage all members via ownership" 
ON public.business_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = business_members.business_id 
    AND b.owner_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = business_members.business_id 
    AND b.owner_id = auth.uid()
  )
);