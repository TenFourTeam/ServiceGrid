-- Fix all remaining functions to have proper search_path
CREATE OR REPLACE FUNCTION public.link_invoice_relations(p_invoice_id uuid, p_quote_id uuid DEFAULT NULL::uuid, p_job_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_quote_business_id uuid;
  v_job_business_id uuid;
  v_user_profile_id uuid;
BEGIN
  -- Get current user's profile ID if not provided
  IF p_user_id IS NULL THEN
    SELECT id INTO v_user_profile_id 
    FROM public.profiles 
    WHERE clerk_user_id = public.current_clerk_user_id();
  ELSE
    v_user_profile_id := p_user_id;
  END IF;

  IF v_user_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Get the invoice's business_id and verify user has access
  SELECT business_id INTO v_business_id
  FROM public.invoices
  WHERE id = p_invoice_id;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  -- Verify user is a member of the business
  IF NOT public.is_business_member(v_business_id) THEN
    RAISE EXCEPTION 'User does not have access to this business';
  END IF;

  -- If linking a quote, verify it belongs to the same business
  IF p_quote_id IS NOT NULL THEN
    SELECT business_id INTO v_quote_business_id
    FROM public.quotes
    WHERE id = p_quote_id;

    IF v_quote_business_id IS NULL THEN
      RAISE EXCEPTION 'Quote not found';
    END IF;

    IF v_quote_business_id != v_business_id THEN
      RAISE EXCEPTION 'Quote does not belong to the same business as the invoice';
    END IF;
  END IF;

  -- If linking a job, verify it belongs to the same business
  IF p_job_id IS NOT NULL THEN
    SELECT business_id INTO v_job_business_id
    FROM public.jobs
    WHERE id = p_job_id;

    IF v_job_business_id IS NULL THEN
      RAISE EXCEPTION 'Job not found';
    END IF;

    IF v_job_business_id != v_business_id THEN
      RAISE EXCEPTION 'Job does not belong to the same business as the invoice';
    END IF;
  END IF;

  -- Update the invoice with the new quote_id and job_id
  UPDATE public.invoices
  SET 
    quote_id = p_quote_id,
    job_id = p_job_id,
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_inv_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_seq integer;
  v_number text;
  v_user_profile_id uuid;
BEGIN
  -- Get current user's profile ID
  SELECT id INTO v_user_profile_id 
  FROM public.profiles 
  WHERE clerk_user_id = public.current_clerk_user_id();

  UPDATE public.businesses b
  SET inv_seq = b.inv_seq + 1
  WHERE b.id = p_business_id AND b.owner_id = v_user_profile_id
  RETURNING b.inv_prefix, b.inv_seq INTO v_prefix, v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Business not found or not owned by current user';
  END IF;

  v_number := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_number;
END;
$$;