-- Customer accounts table with hybrid auth support (Clerk + magic-link + password)
CREATE TABLE public.customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  
  -- Clerk authentication (for repeat customers)
  clerk_user_id TEXT UNIQUE,
  
  -- Password authentication (basic accounts)
  password_hash TEXT,
  
  -- Magic-link authentication (one-time access)
  magic_token TEXT,
  magic_token_expires_at TIMESTAMPTZ,
  
  -- Session tracking
  last_login_at TIMESTAMPTZ,
  auth_method TEXT, -- 'clerk', 'password', 'magic_link'
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(customer_id),
  UNIQUE(email)
);

-- Customer portal invites
CREATE TABLE public.customer_portal_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  business_id UUID NOT NULL REFERENCES public.businesses(id),
  email TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer sessions (for non-Clerk auth methods)
CREATE TABLE public.customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  auth_method TEXT NOT NULL, -- 'magic_link' or 'password'
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_portal_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_accounts
-- Service role only for direct access (edge functions handle auth)
CREATE POLICY "Service role can manage customer accounts"
ON public.customer_accounts
FOR ALL
USING (auth.role() = 'service_role');

-- Business owners can view their customers' accounts
CREATE POLICY "Business owners can view customer accounts"
ON public.customer_accounts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.businesses b ON c.business_id = b.id
    WHERE c.id = customer_accounts.customer_id
    AND b.owner_id = auth.uid()
  )
);

-- RLS Policies for customer_portal_invites
CREATE POLICY "Service role can manage invites"
ON public.customer_portal_invites
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Business members can manage invites"
ON public.customer_portal_invites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    LEFT JOIN public.business_permissions bp ON b.id = bp.business_id
    WHERE b.id = customer_portal_invites.business_id
    AND (b.owner_id = auth.uid() OR bp.user_id = auth.uid())
  )
);

-- RLS Policies for customer_sessions
CREATE POLICY "Service role can manage sessions"
ON public.customer_sessions
FOR ALL
USING (auth.role() = 'service_role');

-- Indexes for performance
CREATE INDEX idx_customer_accounts_clerk_user_id ON public.customer_accounts(clerk_user_id);
CREATE INDEX idx_customer_accounts_email ON public.customer_accounts(email);
CREATE INDEX idx_customer_accounts_magic_token ON public.customer_accounts(magic_token);
CREATE INDEX idx_customer_portal_invites_token ON public.customer_portal_invites(invite_token);
CREATE INDEX idx_customer_portal_invites_customer ON public.customer_portal_invites(customer_id);
CREATE INDEX idx_customer_sessions_token ON public.customer_sessions(session_token);
CREATE INDEX idx_customer_sessions_account ON public.customer_sessions(customer_account_id);

-- Trigger for updated_at
CREATE TRIGGER update_customer_accounts_updated_at
BEFORE UPDATE ON public.customer_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();