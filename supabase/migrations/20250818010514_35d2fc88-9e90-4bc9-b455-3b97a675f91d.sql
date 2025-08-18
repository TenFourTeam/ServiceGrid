-- Fix search path for functions to prevent security warnings
-- Update all functions to have proper search_path set

-- Fix normalize_business_name function
CREATE OR REPLACE FUNCTION public.normalize_business_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- default if missing/empty
  IF NEW.name IS NULL OR BTRIM(NEW.name) = '' THEN
    NEW.name := 'My Business';
  END IF;

  -- flag customized iff not the default (case-insensitive)
  IF LOWER(NEW.name) = 'my business' THEN
    NEW.name_customized := false;
  ELSE
    NEW.name_customized := true;
  END IF;

  RETURN NEW;
END
$function$;

-- Fix trigger_business_audit function
CREATE OR REPLACE FUNCTION public.trigger_business_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Fix set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;