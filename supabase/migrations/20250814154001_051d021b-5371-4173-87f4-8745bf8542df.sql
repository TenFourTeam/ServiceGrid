-- Fix security warnings by setting search_path for all functions

-- Update ensure_default_business_membership function to set search_path
CREATE OR REPLACE FUNCTION public.ensure_default_business_membership()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If setting a default_business_id, ensure user has membership in that business
  IF NEW.default_business_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.business_members 
      WHERE user_id = NEW.id AND business_id = NEW.default_business_id
    ) THEN
      RAISE EXCEPTION 'Cannot set default_business_id to a business where user has no membership';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;