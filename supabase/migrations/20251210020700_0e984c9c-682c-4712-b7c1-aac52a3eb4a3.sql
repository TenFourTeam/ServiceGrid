-- Create junction table for multi-business customer access
CREATE TABLE public.customer_account_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_account_id, customer_id)
);

-- Add indexes for performance
CREATE INDEX idx_customer_account_links_account ON public.customer_account_links(customer_account_id);
CREATE INDEX idx_customer_account_links_customer ON public.customer_account_links(customer_id);
CREATE INDEX idx_customer_account_links_business ON public.customer_account_links(business_id);

-- Add active business context to sessions
ALTER TABLE public.customer_sessions 
ADD COLUMN active_customer_id UUID REFERENCES public.customers(id),
ADD COLUMN active_business_id UUID REFERENCES public.businesses(id);

-- Enable RLS on the new table
ALTER TABLE public.customer_account_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_account_links
CREATE POLICY "Customer accounts can view their own links"
ON public.customer_account_links
FOR SELECT
USING (
  customer_account_id IN (
    SELECT id FROM public.customer_accounts 
    WHERE id = customer_account_id
  )
);

-- Migrate existing data: create links for all existing customer_accounts
INSERT INTO public.customer_account_links (customer_account_id, customer_id, business_id, is_primary)
SELECT 
  ca.id as customer_account_id,
  ca.customer_id,
  c.business_id,
  true as is_primary
FROM public.customer_accounts ca
JOIN public.customers c ON c.id = ca.customer_id
WHERE ca.customer_id IS NOT NULL;

-- Also link any other customers with matching email
INSERT INTO public.customer_account_links (customer_account_id, customer_id, business_id, is_primary)
SELECT DISTINCT
  ca.id as customer_account_id,
  c.id as customer_id,
  c.business_id,
  false as is_primary
FROM public.customer_accounts ca
JOIN public.customers c ON LOWER(c.email) = LOWER(ca.email)
WHERE c.id != ca.customer_id
AND NOT EXISTS (
  SELECT 1 FROM public.customer_account_links cal 
  WHERE cal.customer_account_id = ca.id AND cal.customer_id = c.id
);