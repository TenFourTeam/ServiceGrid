-- Update the constraint function to check both owner_id and business_members
CREATE OR REPLACE FUNCTION public.ensure_default_business_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If setting a default_business_id, ensure user has access to that business
  IF NEW.default_business_id IS NOT NULL THEN
    -- Check if user is the owner of the business OR has membership
    IF NOT (
      -- Check if user owns the business
      EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = NEW.default_business_id AND owner_id = NEW.id
      ) 
      OR
      -- Check if user has membership in the business
      EXISTS (
        SELECT 1 FROM public.business_members 
        WHERE user_id = NEW.id AND business_id = NEW.default_business_id
      )
    ) THEN
      RAISE EXCEPTION 'Cannot set default_business_id to a business where user has no ownership or membership';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;