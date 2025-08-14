-- Fix Database Security Issues

-- 1. Fix function search path for security (set search_path explicitly)
CREATE OR REPLACE FUNCTION public.next_est_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_prefix text;
  v_seq integer;
  v_number text;
BEGIN
  UPDATE public.businesses b
  SET est_seq = b.est_seq + 1
  WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  RETURNING b.est_prefix, b.est_seq INTO v_prefix, v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Business not found or not owned by current user';
  END IF;

  v_number := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.next_inv_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_prefix text;
  v_seq integer;
  v_number text;
BEGIN
  UPDATE public.businesses b
  SET inv_seq = b.inv_seq + 1
  WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  RETURNING b.inv_prefix, b.inv_seq INTO v_prefix, v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Business not found or not owned by current user';
  END IF;

  v_number := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_default_business()
RETURNS businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  b public.businesses%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO b
  FROM public.businesses
  WHERE owner_id = auth.uid()
  ORDER BY created_at
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.businesses (name, owner_id)
    VALUES ('My Business', auth.uid())
    RETURNING * INTO b;
  END IF;

  RETURN b;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_counts(owner_id uuid)
RETURNS TABLE(customers bigint, jobs bigint, quotes bigint, customer_data jsonb, invoice_data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.customers WHERE customers.owner_id = get_dashboard_counts.owner_id),
    (SELECT COUNT(*) FROM public.jobs WHERE jobs.owner_id = get_dashboard_counts.owner_id),
    (SELECT COUNT(*) FROM public.quotes WHERE quotes.owner_id = get_dashboard_counts.owner_id),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'email', email,
      'phone', phone,
      'address', address
    )), '[]'::jsonb) FROM public.customers WHERE customers.owner_id = get_dashboard_counts.owner_id),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id,
      'number', number,
      'customerId', customer_id,
      'jobId', job_id,
      'taxRate', tax_rate,
      'discount', discount,
      'subtotal', subtotal,
      'total', total,
      'status', status,
      'dueAt', due_at,
      'createdAt', created_at,
      'updatedAt', updated_at,
      'publicToken', public_token
    )), '[]'::jsonb) FROM public.invoices WHERE invoices.owner_id = get_dashboard_counts.owner_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_business_role(p_business_id uuid)
RETURNS business_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role FROM public.business_members 
  WHERE business_id = p_business_id AND user_id = auth.uid()
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT COALESCE(
    (SELECT role FROM public.business_members 
     WHERE business_id = p_business_id AND user_id = auth.uid()) = 'owner',
    false
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members 
    WHERE business_id = p_business_id AND user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.log_audit_action(p_business_id uuid, p_user_id uuid, p_action text, p_resource_type text, p_resource_id text DEFAULT NULL::text, p_details jsonb DEFAULT '{}'::jsonb, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    business_id, user_id, action, resource_type, resource_id,
    details, ip_address, user_agent
  ) VALUES (
    p_business_id, p_user_id, p_action, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_business_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log business creation/updates
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_action(
      NEW.id, -- business_id
      NEW.owner_id, -- user_id
      'create', -- action
      'business', -- resource_type
      NEW.id::text, -- resource_id
      to_jsonb(NEW) -- details
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_action(
      NEW.id, -- business_id
      NEW.owner_id, -- user_id
      'update', -- action
      'business', -- resource_type
      NEW.id::text, -- resource_id
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)) -- details
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;