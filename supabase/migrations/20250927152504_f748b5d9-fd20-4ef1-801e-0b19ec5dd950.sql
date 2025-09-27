-- Create business_permissions table to track user access to businesses
CREATE TABLE public.business_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES public.profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
);

-- Enable RLS on business_permissions
ALTER TABLE public.business_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_permissions
CREATE POLICY "Users can view their own business permissions" 
ON public.business_permissions 
FOR SELECT 
USING (user_id = public.current_user_profile_id());

CREATE POLICY "Business owners can view permissions for their business" 
ON public.business_permissions 
FOR SELECT 
USING (can_manage_business(business_id));

CREATE POLICY "Service role can manage business permissions" 
ON public.business_permissions 
FOR ALL 
USING (true);

-- Update invites table to use user_id instead of email
ALTER TABLE public.invites DROP COLUMN email;
ALTER TABLE public.invites ADD COLUMN invited_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add constraint to ensure invited_user_id is set
ALTER TABLE public.invites ALTER COLUMN invited_user_id SET NOT NULL;

-- Remove email-based columns that are no longer needed
ALTER TABLE public.invites DROP COLUMN IF EXISTS token_hash;
ALTER TABLE public.invites DROP COLUMN IF EXISTS signup_context;

-- Update invites RLS policies
DROP POLICY IF EXISTS "Business owners can manage invites" ON public.invites;

CREATE POLICY "Business owners can manage invites for their business" 
ON public.invites 
FOR ALL
USING (can_manage_business(business_id))
WITH CHECK (can_manage_business(business_id));

CREATE POLICY "Users can view invites sent to them" 
ON public.invites 
FOR SELECT 
USING (invited_user_id = public.current_user_profile_id());

CREATE POLICY "Users can accept/decline their own invites" 
ON public.invites 
FOR UPDATE 
USING (invited_user_id = public.current_user_profile_id());

-- Create function to check if user has business permission
CREATE OR REPLACE FUNCTION public.has_business_permission(p_user_id UUID, p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Check if user owns the business
    EXISTS(
      SELECT 1 FROM public.businesses 
      WHERE id = p_business_id AND owner_id = p_user_id
    ) OR
    -- Check if user has been granted permission
    EXISTS(
      SELECT 1 FROM public.business_permissions 
      WHERE user_id = p_user_id AND business_id = p_business_id
    ),
    false
  );
$$;

-- Create trigger for updated_at on business_permissions
CREATE TRIGGER update_business_permissions_updated_at
BEFORE UPDATE ON public.business_permissions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();