-- Create function to securely link/unlink quotes and jobs to invoices
CREATE OR REPLACE FUNCTION public.link_invoice_relations(
  p_invoice_id uuid,
  p_quote_id uuid DEFAULT NULL,
  p_job_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;