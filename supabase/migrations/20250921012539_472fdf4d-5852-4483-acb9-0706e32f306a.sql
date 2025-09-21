-- Add quote management columns for duplicate prevention
ALTER TABLE public.quotes 
ADD COLUMN is_active boolean NOT NULL DEFAULT true,
ADD COLUMN superseded_by_quote_id uuid DEFAULT NULL,
ADD COLUMN superseded_at timestamp with time zone DEFAULT NULL;

-- Add index for better performance on active subscription queries
CREATE INDEX idx_quotes_active_subscription ON public.quotes (customer_id, business_id, is_subscription, is_active) 
WHERE is_active = true AND is_subscription = true;

-- Add index for superseded quotes
CREATE INDEX idx_quotes_superseded ON public.quotes (superseded_by_quote_id) 
WHERE superseded_by_quote_id IS NOT NULL;

-- Function to supersede previous quotes when sending new ones
CREATE OR REPLACE FUNCTION public.supersede_previous_quotes(
  p_customer_id uuid,
  p_business_id uuid,
  p_new_quote_id uuid,
  p_is_subscription boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only supersede quotes that match the subscription type and are still active
  UPDATE public.quotes 
  SET 
    is_active = false,
    superseded_by_quote_id = p_new_quote_id,
    superseded_at = now(),
    updated_at = now()
  WHERE 
    customer_id = p_customer_id 
    AND business_id = p_business_id
    AND id != p_new_quote_id
    AND is_active = true
    AND is_subscription = p_is_subscription
    AND status IN ('Draft', 'Sent');
END;
$$;

-- Function to check for existing active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  p_customer_id uuid,
  p_business_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.recurring_schedules rs
    WHERE rs.customer_id = p_customer_id 
      AND rs.business_id = p_business_id 
      AND rs.is_active = true
  );
END;
$$;

-- Function to get active subscription info
CREATE OR REPLACE FUNCTION public.get_active_subscription_info(
  p_customer_id uuid,
  p_business_id uuid
) RETURNS TABLE (
  quote_id uuid,
  subscription_id text,
  frequency quote_frequency,
  next_billing_date timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.quote_id,
    rs.stripe_subscription_id,
    rs.frequency,
    rs.next_billing_date
  FROM public.recurring_schedules rs
  WHERE rs.customer_id = p_customer_id 
    AND rs.business_id = p_business_id 
    AND rs.is_active = true
  LIMIT 1;
END;
$$;