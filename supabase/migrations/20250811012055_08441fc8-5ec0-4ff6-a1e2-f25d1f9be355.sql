
-- Stripe Connect fields on vendor businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS stripe_account_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS application_fee_bps integer NOT NULL DEFAULT 0
    CHECK (application_fee_bps >= 0 AND application_fee_bps <= 10000);

-- Optional: comments for clarity
COMMENT ON COLUMN public.businesses.stripe_account_id IS 'Stripe Connected Account ID for this vendor';
COMMENT ON COLUMN public.businesses.stripe_charges_enabled IS 'Stripe flag indicating the connected account can accept charges';
COMMENT ON COLUMN public.businesses.stripe_payouts_enabled IS 'Stripe flag indicating the connected account can receive payouts';
COMMENT ON COLUMN public.businesses.stripe_details_submitted IS 'Stripe flag indicating onboarding details were submitted';
COMMENT ON COLUMN public.businesses.application_fee_bps IS 'Platform fee in basis points (1% = 100 bps)';
