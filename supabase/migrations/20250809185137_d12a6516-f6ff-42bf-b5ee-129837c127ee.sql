-- Security hardening: set explicit schema search path for trigger function
ALTER FUNCTION public.set_updated_at()
  SET search_path = public;