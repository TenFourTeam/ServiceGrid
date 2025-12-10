-- Create the mark_conversation_read RPC function
CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO sg_conversation_reads (conversation_id, user_id, last_read_at)
  VALUES (p_conversation_id, p_user_id, now())
  ON CONFLICT (conversation_id, user_id) 
  DO UPDATE SET last_read_at = now();
END;
$$;