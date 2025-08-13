-- Fix search path security warnings by setting explicit search_path
CREATE OR REPLACE FUNCTION public.user_business_role(p_business_id UUID)
RETURNS business_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT role FROM business_members 
  WHERE business_id = p_business_id AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT role FROM business_members 
     WHERE business_id = p_business_id AND user_id = auth.uid()) = 'owner',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members 
    WHERE business_id = p_business_id AND user_id = auth.uid()
  );
$$;