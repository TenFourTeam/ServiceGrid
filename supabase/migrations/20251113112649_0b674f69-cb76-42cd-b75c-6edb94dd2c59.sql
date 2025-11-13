-- Fix ambiguous created_at in get_conversations_with_preview LATERAL subquery
DROP FUNCTION IF EXISTS get_conversations_with_preview(uuid);

CREATE OR REPLACE FUNCTION get_conversations_with_preview(p_business_id uuid)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  title text,
  created_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  last_message_at timestamp with time zone,
  is_archived boolean,
  metadata jsonb,
  latest_message text,
  latest_sender_name text,
  unread_count integer
) AS $$
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
    c.metadata,
    m.content as latest_message,
    p.full_name as latest_sender_name,
    0 as unread_count
  FROM sg_conversations c
  LEFT JOIN LATERAL (
    SELECT msg.content, msg.sender_id, msg.created_at
    FROM sg_messages msg
    WHERE msg.conversation_id = c.id
    ORDER BY msg.created_at DESC
    LIMIT 1
  ) m ON true
  LEFT JOIN profiles p ON p.id = m.sender_id
  WHERE c.business_id = p_business_id
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';