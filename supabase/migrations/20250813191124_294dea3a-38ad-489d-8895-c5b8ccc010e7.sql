-- Create invites table for token-based invitations
CREATE TABLE public.invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  email TEXT NOT NULL,
  role business_role NOT NULL DEFAULT 'worker',
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  invited_by UUID NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  redeemed_by UUID,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Create policies for business owners to manage invites
CREATE POLICY "Business owners can manage invites" 
ON public.invites 
FOR ALL 
USING (can_manage_business(business_id))
WITH CHECK (can_manage_business(business_id));

-- Create index for token lookups
CREATE INDEX idx_invites_token_hash ON public.invites(token_hash);
CREATE INDEX idx_invites_business_email ON public.invites(business_id, email);
CREATE INDEX idx_invites_expires_at ON public.invites(expires_at);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_invites_updated_at
BEFORE UPDATE ON public.invites
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();