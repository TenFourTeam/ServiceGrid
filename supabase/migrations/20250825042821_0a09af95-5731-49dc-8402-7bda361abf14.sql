-- Update next_inv_number function to accept user_id parameter
CREATE OR REPLACE FUNCTION public.next_inv_number(p_business_id uuid, p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_seq integer;
  v_number text;
BEGIN
  UPDATE public.businesses b
  SET inv_seq = b.inv_seq + 1
  WHERE b.id = p_business_id AND b.owner_id = p_user_id
  RETURNING b.inv_prefix, b.inv_seq INTO v_prefix, v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Business not found or not owned by current user';
  END IF;

  v_number := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_number;
END;
$function$;