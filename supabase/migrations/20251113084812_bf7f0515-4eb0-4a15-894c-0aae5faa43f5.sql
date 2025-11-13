-- Fix function search paths for security using CASCADE
DROP FUNCTION IF EXISTS update_conversation_last_message() CASCADE;
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sg_conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trg_update_conversation_timestamp
AFTER INSERT ON public.sg_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();

-- Fix the other function
DROP FUNCTION IF EXISTS get_conversations_with_preview(UUID);
CREATE OR REPLACE FUNCTION get_conversations_with_preview(p_business_id UUID)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  title TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  is_archived BOOLEAN,
  latest_message TEXT,
  latest_sender_name TEXT,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.business_id,
    c.title,
    c.created_by,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    c.is_archived,
    m.content AS latest_message,
    p.full_name AS latest_sender_name,
    0::BIGINT AS unread_count
  FROM public.sg_conversations c
  LEFT JOIN LATERAL (
    SELECT content, sender_id
    FROM public.sg_messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  LEFT JOIN public.profiles p ON p.id = m.sender_id
  WHERE c.business_id = p_business_id
    AND c.is_archived = false
  ORDER BY c.last_message_at DESC;
END;
$$;