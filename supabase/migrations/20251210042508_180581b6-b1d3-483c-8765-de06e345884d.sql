-- Add stripe_customer_id to customer_accounts for saved payment methods
ALTER TABLE public.customer_accounts
ADD COLUMN stripe_customer_id TEXT NULL;

-- Create index for efficient lookup
CREATE INDEX idx_customer_accounts_stripe_customer_id 
ON public.customer_accounts(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;